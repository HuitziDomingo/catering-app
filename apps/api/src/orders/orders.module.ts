import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem } from '../database/entities/menu-item.entity';
import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { User } from '../database/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '../pdf/pdf.module';
import { StorageModule } from '../storage/storage.module';
import { OrdersController } from './orders.controller';
import { ReceiptLinkController } from './receipt-link.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, MenuItem, User]),
    NotificationsModule,
    PdfModule,
    StorageModule,
  ],
  controllers: [OrdersController, ReceiptLinkController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
