// Services - Barrel export
export { OrderService } from './order-service'
export type {
  Order,
  OrderStatus,
  OrderPriority,
  CreateOrderInput,
  UpdateOrderInput,
  OrderFilters,
} from './order-service'

export { InventoryService } from './inventory-service'
export type {
  InventoryItem,
  InventoryUnit,
  CreateInventoryInput,
  UpdateInventoryInput,
  InventoryFilters,
  InventoryAuditEntry,
} from './inventory-service'
