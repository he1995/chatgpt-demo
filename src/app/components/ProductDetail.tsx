import React, { useState } from 'react';
import styles from './productDetail.module.scss';
import { useProductStore } from '../store/product';
import { Path } from '../constant';
import { useNavigate } from 'react-router-dom'; 
import { Order, useOrderStore } from '../store/order';
import { useUserInfoStore } from '../store/user';

const ProductDetail: React.FC = () => {
  const [email, setEmail] = useState('');
  const { currentProduct } = useProductStore();
  const navigate = useNavigate();       

  function createOrder() {
    const order: Order = {
      id: "",
      name: currentProduct.name,
      email: email,
      price: currentProduct.realPrice,
      username: useUserInfoStore.getState().userInfo?.username || "",
      createTime: "",
      delivery: "自动发货",
      status: 0,
      payMethod: "支付宝",
    };

    useOrderStore.getState().createOrder(order);
    navigate(Path.Order);
  }

  return (
    <div className={styles.productDetail}>
      <h2 className={styles.title}>商品详情</h2>
      <div className={styles.detailCard}>
        <img src={currentProduct.picture} alt={currentProduct.name} className={styles.productImage} />
        <div className={styles.info}>
          <h3>{currentProduct.name}</h3>
          <p className={styles.realPrice}>{currentProduct.realPrice}</p>
          <p className={styles.originPrice}>{currentProduct.originPrice}</p>
          <p>自动发货</p>
          <input 
            type="text" 
            placeholder="填写你的邮箱" 
            className={styles.emailInput}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
          <button className={styles.orderButton} onClick={() => createOrder()}>下单</button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 