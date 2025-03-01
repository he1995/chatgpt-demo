import React from 'react';
import styles from './productDetail.module.scss';
import { useProductStore } from '../store/product';
import { Path } from '../constant';
import { useNavigate } from 'react-router-dom'; 

const ProductDetail: React.FC = () => {
  const { currentProduct } = useProductStore();
  const navigate = useNavigate();       
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
          <input type="text" placeholder="填写你的邮箱" className={styles.emailInput} />
          <button className={styles.orderButton} onClick={() => navigate(Path.Order)}>下单</button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 