import styled from "styled-components";
import type { TicketStatus } from "../types/ticket";

const StatusBadge = styled.span<{ $status: TicketStatus }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid ${({ $status }) => `var(--status-${$status.toLowerCase()}-border)`};
  border-radius: var(--radius-control);
  background: ${({ $status }) => `var(--status-${$status.toLowerCase()}-bg)`};
  color: ${({ $status }) => `var(--status-${$status.toLowerCase()}-text)`};
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
`;

export default StatusBadge;
