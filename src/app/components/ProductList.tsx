import React, { useEffect } from 'react';
import styles from './productList.module.scss';
import { useNavigate } from 'react-router-dom';
import { Product, useProductStore } from '../store/product';
import { Path } from '../constant';



const ProductList: React.FC = () => {
    const { allProducts, selectProduct, fetchAllProducts } = useProductStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllProducts();
    }, []);

    const clickProduct = (product: Product) => {
        selectProduct(product);
        navigate(Path.ProductDetail);
    };

    return (
        <div className={styles.productList}>
            <h2 className={styles.title}>选择商品</h2>
            <div className={styles.products}>
                {allProducts.map((product) => (
                    <div key={product.id} className={styles.productCard} onClick={() => clickProduct(product)}>
                        <img src={product.picture} alt={product.name} className={styles.productImage} />
                        <h3>{product.name}</h3>
                        <p className={styles.realPrice}>{product.realPrice}</p>
                        <p className={styles.originPrice}>{product.originPrice}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductList; 