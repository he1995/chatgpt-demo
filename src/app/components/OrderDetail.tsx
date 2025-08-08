import React from 'react';
import styles from './orderDetail.module.scss';
import { useOrderStore } from '../store/order';

const OrderDetail: React.FC = () => {
  const order = useOrderStore((state) => state.currentOrder);

  return (
    <div className={styles.orderDetail}>
      <h2 className={styles.title}>订单详情</h2>
      <div className={styles.detailCard}>
        <ul>
          <li>订单编号: {order.id}</li>
          <li>订单名称: {order.name}</li>
          <li>订单创建时间: {order.createTime}</li>
          <li>下单邮箱: {order.email}</li>
          <li>订单类型: <span className={styles.tag}>{order.delivery}</span></li>
          <li>实际支付价格: <span className={styles.tag}>{order.price}</span></li>
          <li>订单状态: <span className={styles.tag}>{order.status}</span></li>
          <li>支付方式: {order.payMethod}</li>
        </ul>
        <button className={styles.payButton}>立即支付</button>
      </div>
    </div>
  );
};

export default OrderDetail; 