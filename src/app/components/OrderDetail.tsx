import React from 'react';
import styles from './orderDetail.module.scss';

interface Order {
  orderId: string;
  productName: string;
  orderDate: string;
  email: string;
  orderType: string;
  realPrice: string;
  orderStatus: string;
  paymentMethod: string;
}

const OrderDetail: React.FC = () => {
  const order: Order = {
    orderId: 'FNR6FCR2LGLOJAGL',
    productName: '智能助手月度会员',
    orderDate: '2025-02-13 14:57:12',
    email: '1225658928@qq.com',
    orderType: '自动发货',
    realPrice: '¥20',
    orderStatus: '已完成',
    paymentMethod: '支付宝 PC',
  };

  return (
    <div className={styles.orderDetail}>
      <h2 className={styles.title}>订单详情</h2>
      <div className={styles.detailCard}>
        <ul>
          <li>订单编号: {order.orderId}</li>
          <li>订单名称: {order.productName}</li>
          <li>订单创建时间: {order.orderDate}</li>
          <li>下单邮箱: {order.email}</li>
          <li>订单类型: <span className={styles.tag}>{order.orderType}</span></li>
          <li>实际支付价格: <span className={styles.tag}>{order.realPrice}</span></li>
          <li>订单状态: <span className={styles.tag}>{order.orderStatus}</span></li>
          <li>支付方式: {order.paymentMethod}</li>
        </ul>
        <button className={styles.payButton}>立即支付</button>
      </div>
    </div>
  );
};

export default OrderDetail; 