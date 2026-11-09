import pytest
from httpx import AsyncClient

from app.modules.users.models import UserRole
from tests.integration.conftest import ApiUser, MakeUser

TICKET = {"title": "Printer offline", "description": "3rd floor printer", "category": "HARDWARE"}


@pytest.fixture
async def user(make_user: MakeUser) -> ApiUser:
    return await make_user("user@example.com")


@pytest.fixture
async def other_user(make_user: MakeUser) -> ApiUser:
    return await make_user("other@example.com")


@pytest.fixture
async def admin(make_user: MakeUser) -> ApiUser:
    return await make_user("admin@example.com", UserRole.ADMIN)


@pytest.fixture
async def other_admin(make_user: MakeUser) -> ApiUser:
    return await make_user("admin2@example.com", UserRole.ADMIN)


async def create_ticket(client: AsyncClient, owner: ApiUser, **overrides: str) -> dict:
    response = await client.post("/tickets", json={**TICKET, **overrides}, headers=owner.headers)
    assert response.status_code == 201, response.text
    return response.json()


async def act(client: AsyncClient, actor: ApiUser, ticket_id: int, action: str) -> int:
    response = await client.post(f"/tickets/{ticket_id}/{action}", headers=actor.headers)
    return response.status_code


async def test_create_ticket(client: AsyncClient, user: ApiUser) -> None:
    ticket = await create_ticket(client, user)

    assert ticket["status"] == "OPEN"
    assert ticket["created_by_id"] == user.id
    assert ticket["created_by_name"] == "User"
    assert ticket["assigned_to_id"] is None
    assert ticket["assigned_to_name"] is None


async def test_ticket_names_use_registration_name_and_admin_label(
    client: AsyncClient, make_user: MakeUser
) -> None:
    owner = await make_user("maria@example.com", name="Maria Silva")
    admin = await make_user("support@example.com", UserRole.ADMIN, name="Support Operator")
    ticket = await create_ticket(client, owner)
    assert ticket["created_by_name"] == "Maria Silva"

    response = await client.post(f"/tickets/{ticket['id']}/assign", headers=admin.headers)
    assert response.status_code == 200
    assert response.json()["created_by_name"] == "Maria Silva"
    assert response.json()["assigned_to_name"] == "Admin"

    history = await client.get(f"/tickets/{ticket['id']}/history", headers=owner.headers)
    assert history.json()[0]["actor_name"] == "Admin"

    admin_ticket = await create_ticket(client, admin)
    assert admin_ticket["created_by_name"] == "Admin"


async def test_create_ticket_validates_input_and_requires_auth(
    client: AsyncClient, user: ApiUser
) -> None:
    no_auth = await client.post("/tickets", json=TICKET)
    bad_category = await client.post(
        "/tickets", json={**TICKET, "category": "COFFEE"}, headers=user.headers
    )
    blank_title = await client.post(
        "/tickets", json={**TICKET, "title": "  "}, headers=user.headers
    )
    forced_status = await client.post(
        "/tickets", json={**TICKET, "status": "CLOSED"}, headers=user.headers
    )

    assert no_auth.status_code == 401
    assert bad_category.status_code == 422
    assert blank_title.status_code == 422
    assert forced_status.status_code == 422


async def test_user_only_sees_own_tickets_and_admin_sees_all(
    client: AsyncClient, user: ApiUser, other_user: ApiUser, admin: ApiUser
) -> None:
    mine = await create_ticket(client, user)
    theirs = await create_ticket(client, other_user)

    user_list = await client.get("/tickets", headers=user.headers)
    user_filtering_other = await client.get(
        "/tickets", params={"created_by_id": other_user.id}, headers=user.headers
    )
    other_ticket = await client.get(f"/tickets/{theirs['id']}", headers=user.headers)
    admin_list = await client.get("/tickets", headers=admin.headers)

    assert [t["id"] for t in user_list.json()["items"]] == [mine["id"]]
    assert user_list.json()["items"][0]["created_by_name"] == "User"
    assert user_filtering_other.json()["total"] == 0
    assert other_ticket.status_code == 404
    assert admin_list.json()["total"] == 2


async def test_list_filters_paginates_and_sorts(
    client: AsyncClient, user: ApiUser, admin: ApiUser
) -> None:
    await create_ticket(client, user, title="B ticket", category="NETWORK")
    await create_ticket(client, user, title="A ticket", category="NETWORK")
    third = await create_ticket(client, user, title="C ticket", category="ACCESS")
    await act(client, admin, third["id"], "assign")

    by_category = await client.get("/tickets", params={"category": "NETWORK"}, headers=user.headers)
    by_assignee = await client.get(
        "/tickets",
        params={"assigned_to_id": admin.id, "status": "IN_PROGRESS"},
        headers=admin.headers,
    )
    page = await client.get(
        "/tickets",
        params={"sort_by": "title", "order": "asc", "limit": 2, "offset": 1},
        headers=user.headers,
    )
    bad_sort = await client.get("/tickets", params={"sort_by": "password"}, headers=user.headers)
    bad_limit = await client.get("/tickets", params={"limit": 1000}, headers=user.headers)

    assert by_category.json()["total"] == 2
    assert [t["id"] for t in by_assignee.json()["items"]] == [third["id"]]
    assert page.json()["total"] == 3
    assert [t["title"] for t in page.json()["items"]] == ["B ticket", "C ticket"]
    assert bad_sort.status_code == 422
    assert bad_limit.status_code == 422


async def test_full_lifecycle_records_history(
    client: AsyncClient, user: ApiUser, admin: ApiUser
) -> None:
    ticket = await create_ticket(client, user)
    ticket_id = ticket["id"]

    assert await act(client, admin, ticket_id, "assign") == 200
    assert await act(client, admin, ticket_id, "resolve") == 200
    assert await act(client, user, ticket_id, "reopen") == 200
    assert await act(client, admin, ticket_id, "resolve") == 200
    assert await act(client, user, ticket_id, "close") == 200

    final = await client.get(f"/tickets/{ticket_id}", headers=user.headers)
    history = await client.get(f"/tickets/{ticket_id}/history", headers=user.headers)

    assert final.json()["status"] == "CLOSED"
    assert final.json()["created_by_name"] == "User"
    assert final.json()["assigned_to_id"] == admin.id
    assert final.json()["assigned_to_name"] == "Admin"
    assert [e["actor_name"] for e in history.json()] == ["Admin", "Admin", "User", "Admin", "User"]
    assert [(e["action"], e["from_status"], e["to_status"]) for e in history.json()] == [
        ("ASSIGN", "OPEN", "IN_PROGRESS"),
        ("RESOLVE", "IN_PROGRESS", "RESOLVED"),
        ("REOPEN", "RESOLVED", "IN_PROGRESS"),
        ("RESOLVE", "IN_PROGRESS", "RESOLVED"),
        ("CLOSE", "RESOLVED", "CLOSED"),
    ]
    assert [e["actor_id"] for e in history.json()] == [
        admin.id,
        admin.id,
        user.id,
        admin.id,
        user.id,
    ]


async def test_action_permissions(
    client: AsyncClient, user: ApiUser, other_user: ApiUser, admin: ApiUser, other_admin: ApiUser
) -> None:
    ticket_id = (await create_ticket(client, user))["id"]

    assert await act(client, user, ticket_id, "assign") == 403
    assert await act(client, other_user, ticket_id, "assign") == 404

    assert await act(client, admin, ticket_id, "assign") == 200
    assert await act(client, other_admin, ticket_id, "resolve") == 403
    assert await act(client, user, ticket_id, "resolve") == 403

    assert await act(client, admin, ticket_id, "resolve") == 200
    assert await act(client, admin, ticket_id, "reopen") == 403
    assert await act(client, other_admin, ticket_id, "close") == 200


async def test_actions_in_wrong_status_conflict(
    client: AsyncClient, user: ApiUser, admin: ApiUser, other_admin: ApiUser
) -> None:
    ticket_id = (await create_ticket(client, user))["id"]

    assert await act(client, admin, ticket_id, "resolve") == 409
    assert await act(client, user, ticket_id, "close") == 409
    assert await act(client, user, ticket_id, "reopen") == 409

    assert await act(client, admin, ticket_id, "assign") == 200
    assert await act(client, other_admin, ticket_id, "assign") == 409

    assert await act(client, admin, ticket_id, "resolve") == 200
    assert await act(client, user, ticket_id, "close") == 200
    assert await act(client, user, ticket_id, "reopen") == 409


async def test_unknown_ticket_returns_404(client: AsyncClient, admin: ApiUser) -> None:
    response = await client.get("/tickets/999999", headers=admin.headers)

    assert response.status_code == 404
    assert await act(client, admin, 999999, "assign") == 404


async def test_creator_edits_only_while_open(
    client: AsyncClient, user: ApiUser, admin: ApiUser
) -> None:
    ticket_id = (await create_ticket(client, user))["id"]

    edited = await client.patch(
        f"/tickets/{ticket_id}", json={"title": "New title"}, headers=user.headers
    )
    by_admin = await client.patch(
        f"/tickets/{ticket_id}", json={"title": "X"}, headers=admin.headers
    )
    empty = await client.patch(f"/tickets/{ticket_id}", json={}, headers=user.headers)
    null_title = await client.patch(
        f"/tickets/{ticket_id}", json={"title": None}, headers=user.headers
    )
    await act(client, admin, ticket_id, "assign")
    after_assign = await client.patch(
        f"/tickets/{ticket_id}", json={"title": "Too late"}, headers=user.headers
    )

    assert edited.status_code == 200
    assert edited.json()["title"] == "New title"
    assert edited.json()["description"] == TICKET["description"]
    assert by_admin.status_code == 403
    assert empty.status_code == 422
    assert null_title.status_code == 422
    assert after_assign.status_code == 409


async def test_delete_rules(
    client: AsyncClient, user: ApiUser, other_user: ApiUser, admin: ApiUser
) -> None:
    open_ticket = (await create_ticket(client, user))["id"]
    assigned_ticket = (await create_ticket(client, user))["id"]
    await act(client, admin, assigned_ticket, "assign")

    by_stranger = await client.delete(f"/tickets/{open_ticket}", headers=other_user.headers)
    by_creator = await client.delete(f"/tickets/{open_ticket}", headers=user.headers)
    creator_after_assign = await client.delete(f"/tickets/{assigned_ticket}", headers=user.headers)
    by_admin = await client.delete(f"/tickets/{assigned_ticket}", headers=admin.headers)
    gone = await client.get(f"/tickets/{assigned_ticket}", headers=admin.headers)

    assert by_stranger.status_code == 404
    assert by_creator.status_code == 204
    assert creator_after_assign.status_code == 409
    assert by_admin.status_code == 204
    assert gone.status_code == 404
