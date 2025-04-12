import View from '../View.js';
// require('dotenv').config();

const addProductsBtn = document.querySelector('.sidebar_add-products');
const productsListBtn = document.querySelector('.sidebar_products-list');
const sideBar = document.querySelector('.sidebar');
const pageContent = document.querySelector('.page-content');
// const host = process.env.PARCEL_API_URL;
const host = 'http://localhost:4000';

class BisliView extends View {
  constructor() {
    super();
    this.selectedCategory = 'all';
    this.checkAuth();
  }

  checkAuth = async function () {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      console.log('No token found, showing login page');
      this.showLoginPage();
      return false;
    }

    try {
      console.log('Verifying token...');
      const response = await fetch(`${host}/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.log('Token verification failed with status:', response.status);
        this.showLoginPage();
        return false;
      }

      const data = await response.json();
      if (!data.success) {
        console.log('Token invalid:', data.message);
        this.showLoginPage();
        return false;
      }

      console.log('Token verified successfully');
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      this.showLoginPage();
      return false;
    }
  };

  showLoginPage = function () {
    // Create an overlay that covers the entire page
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    document.body.appendChild(overlay);

    const loginContainer = document.createElement('div');
    loginContainer.className = 'login-container';
    loginContainer.innerHTML = `
      <div class="login-card">
        <h2 class="login-title">Admin Dashboard</h2>
        <h3 class="login-subtitle">Admin Login</h3>
        <form id="loginForm" class="login-form">
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" class="login-input" required placeholder="Enter your email">
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" class="login-input" required placeholder="Enter your password">
          </div>
          <button type="submit" class="login-btn">Login</button>
        </form>
      </div>
      <style>
        .login-container {
          width: 100%;
          max-width: 500px;
        }
        .login-card {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          width: 100%;
          text-align: center;
        }
        .login-title {
          color: #333;
          margin-bottom: 20px;
          font-size: 28px;
        }
        .login-subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 20px;
        }
        .login-form {
          text-align: left;
        }
        .form-group {
          margin-bottom: 25px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-size: 16px;
        }
        .login-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        .login-btn {
          background: linear-gradient(45deg, #6a11cb, #2575fc);
          border: none;
          color: white;
          padding: 14px 20px;
          width: 100%;
          border-radius: 4px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .login-btn:hover {
          background: linear-gradient(45deg, #5a0fc8, #1a6efc);
          transform: translateY(-2px);
        }
      </style>
    `;

    overlay.appendChild(loginContainer);

    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch(`${host}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (data.success) {
          localStorage.setItem('auth-token', data.token);

          // Remove the overlay with a fade-out effect
          overlay.style.opacity = '0';
          overlay.style.transition = 'opacity 0.5s ease';

          setTimeout(() => {
            overlay.remove();
            this.loadAddProductsPage();
          }, 500);
        } else {
          // Show error message
          const errorMsg = document.createElement('div');
          errorMsg.className = 'login-error';
          errorMsg.textContent = data.message || 'Invalid credentials';
          errorMsg.style.cssText = `
            color: #ff3860;
            margin-top: 15px;
            text-align: center;
            font-size: 14px;
          `;

          // Remove any existing error message
          const existingError = document.querySelector('.login-error');
          if (existingError) existingError.remove();

          loginForm.appendChild(errorMsg);
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
      }
    });
  };

  addBambaViewHandler = function (handler) {
    window.addEventListener('load', handler);
  };

  pageAuth = function () {
    const continueBtn = document.querySelector('.continue-button');

    continueBtn.addEventListener('click', e => {
      const userEmail = document.getElementById('email-input').value;
      const userPassword = document.getElementById('password-input').value;
      const data = {
        email: userEmail,
        password: userPassword,
      };
      this.loginHandler(data);
    });
  };

  // Previous option;

  loginHandler = async function (formData) {
    await fetch(`${host}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
      .then(response => response.json())
      .then(responseData => {
        if (responseData.success && responseData.adminCheck === 'admin') {
          localStorage.setItem('auth-token', responseData.token);
          alert('Login Successfuly!');
          this.modeHandler();
        } else {
          alert('Access Denied!');
        }
      });
  };

  modeHandler = function () {
    addProductsBtn.addEventListener(
      'click',
      this.loadAddProductsPage.bind(this)
    );
    productsListBtn.addEventListener('click', this.fetchInfo.bind(this));
  };

  clear = function () {
    pageContent.innerHTML = '';
  };

  fetchInfo = async () => {
    await fetch(`${host}/allproducts`)
      .then(res => res.json())
      .then(data => {
        this.loadProductsPage(data);
      });
  };

  async addProduct(e, data, form) {
    if (!(await this.checkAuth())) return;
    e.preventDefault();
    console.log('Starting addProduct function');

    try {
      // First upload main image
      const mainImageFormData = new FormData();
      mainImageFormData.append('mainImage', data.image);

      // Upload small images if they exist
      if (data.multiImages && data.multiImages.length > 0) {
        data.multiImages.forEach(file => {
          mainImageFormData.append('smallImages', file);
        });
      }

      console.log('Uploading images...');
      const uploadResponse = await fetch(`${host}/upload`, {
        method: 'POST',
        body: mainImageFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Image upload failed: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('Upload result:', uploadResult);

      // Then add product with image URLs
      const productData = {
        name: data.name,
        mainImageUrl: uploadResult.image,
        smallImagesUrl: uploadResult.smallImages,
        category: data.category,
        quantity: data.quantity,
        description: data.description,
        oldPrice: data.oldPrice,
        newPrice: data.newPrice,
      };

      console.log('Sending product data:', productData);
      const response = await fetch(`${host}/addproduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error('Failed to add product');
      }

      const result = await response.json();
      if (result.success) {
        alert('Product Added Successfully!');
        form.reset();
        this.fetchInfo();
      } else {
        alert('Failed to add product');
      }
    } catch (err) {
      console.error('Error in addProduct:', err);
      alert('Failed to add product: ' + err.message);
    }
  }

  addProductHandler = function () {
    const addProductBtn = document.querySelector('.addproduct-btn');
    const form = document.getElementById('uploadForm');

    // Add event listeners for both USD price and security margin inputs
    const usdPriceInput = document.getElementById('old-price');
    const securityMarginInput = document.getElementById('security-margin');

    if (usdPriceInput) {
      usdPriceInput.addEventListener('input', calculateILSPrice);
    }

    if (securityMarginInput) {
      securityMarginInput.addEventListener('input', calculateILSPrice);
    }

    form.addEventListener('submit', e => {
      e.preventDefault();

      const prodName = document.getElementById('name').value;
      const prodOldPrice = document.getElementById('old-price').value;
      const prodNewPrice = document.getElementById('new-price').value;
      const prodDescription = document.getElementById('description').value;
      const prodCategory = document.getElementById('category').value;
      const quantity = document.getElementById('quantity').value;
      const prodImage = document.getElementById('mainImage').files[0];
      const multiProdImage = Array.from(
        document.getElementById('smallImages').files
      );

      const data = {
        name: prodName,
        image: prodImage,
        multiImages: multiProdImage,
        category: prodCategory,
        quantity: quantity,
        description: prodDescription,
        oldPrice: +prodOldPrice,
        newPrice: +prodNewPrice,
      };
      console.log('data:', data);

      this.addProduct(e, data, form);
    });
  };

  removeProduct = async function (id) {
    if (!(await this.checkAuth())) return;
    await fetch(`${host}/removeproduct`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: id }),
    });

    // Fetch all products again
    const response = await fetch(`${host}/allproducts`);
    const data = await response.json();

    // Clear and reload the products page
    this.loadProductsPage(data);

    // Set the category filter back to the previously selected category
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter && this.selectedCategory !== 'all') {
      categoryFilter.value = this.selectedCategory;
      // Filter the products based on the selected category
      const filteredProducts = data.filter(
        product => product.category === this.selectedCategory
      );
      this.loadProducts(filteredProducts);
    }
  };

  loadAddProductsPage = async function () {
    if (!(await this.checkAuth())) return;
    this.clear();

    const markup = `
    <form id="uploadForm">
     <div class="add-product">
     <div class="addproduct-itemfield">
       <p>Product Title</p>
       <input 
        type="text"
        name="name"
        id="name"
        placeholder="Type here"
      />
    </div>
    <div class="addproduct-price">
      <div class="addproduct-itemfield">
        <p>Price in $</p>
        <input
          type="text"
          name="usd_price"
          id="old-price"
          placeholder="Type here"
          oninput="calculateILSPrice()"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Security Margin (%)</p>
        <input
          type="number"
          name="security_margin"
          id="security-margin"
          placeholder="5"
          value="5"
          min="0"
          max="100"
          oninput="calculateILSPrice()"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Price in ₪ (Auto-calculated)</p>
        <input
          type="text"
          name="ils_price"
          id="new-price"
          placeholder="Auto-calculated"
          readonly
        />
      </div>
    </div>
    <div class="addproduct-itemfield">
      <p>Product Description</p>
      <input
        type="text"
        name="description"
        id="description"
        placeholder="Type here"
      />
    </div>
    <div class="addproduct-itemfield">
      <p>Product Category</p>
      <select
        name="category"
        id="category"
        class="add-product-selector"
      >
        <option id="necklaces" value="necklaces">Necklaces</option>
        <option id="crochet-necklaces" value="crochet-necklaces">Crochet Necklaces</option>
        <option id="bracelets" value="bracelets">Bracelets</option>
        <option id="hoop-earrings" value="hoop-earrings">Hoop Earrings</option>
        <option id="dangle-earrings" value="dangle-earrings">Dangle Earrings</option>
        <option id="unisex" value="unisex">Unisex</option>
        <option id="dangle-earrings" value="dangle-earrings">Dangle Earrings</option>
        <option id="shalom-club" value="shalom-club">Shalom Club</option>


      </select>
      <p>Quantity</p>
      <select
        name="quantity"
        id="quantity"
        class="quantity-selector"
      >
        <option id="0" value="0">0</option>
        <option id="1" value="1" selected>1</option>
        <option id="2" value="2">2</option>
        <option id="3" value="3">3</option>
        <option id="4" value="4">4</option>
        <option id="5" value="5">5</option>
        <option id="6" value="6">6</option>
        <option id="7" value="7">7</option>
        <option id="8" value="8">8</option>
        <option id="9" value="9">9</option>
        <option id="10" value="10">10</option>
        <option id="11" value="11">11</option>
        <option id="12" value="12">12</option>
        <option id="13" value="13">13</option>
        <option id="14" value="14">14</option>
        <option id="15" value="15">15</option>
        <option id="16" value="16">16</option>
        <option id="17" value="17">17</option>
        <option id="18" value="18">18</option>
        <option id="19" value="19">19</option>
        <option id="20" value="20">20</option>
        
        
      </select>
    </div>
    <br>
    <div class="addproduct-itemfield">
      
             <label for="mainImage">Main Image:</label>
              <input
                type="file"
                name="mainImage"
                id="mainImage"
                required/>
              <br>

              <label for="smallImages">Small Images:</label>
              
                <input
                  type="file"
                  name="smallImages"
                  id="smallImages"
                  multiple/>

    </div>
                  <br>
                  <button class="addproduct-btn">
                     Submit
                  </button>
      </form>
    
    
  `;

    pageContent.insertAdjacentHTML('afterbegin', markup);
    this.addProductHandler();
  };

  loadProductsPage = async function (data) {
    if (!(await this.checkAuth())) return;
    this.clear();

    const markup = `
    <div class="list-product">
      <div class="list-product-header">
        <h1>All Products List</h1>
        <div class="category-filter">
          <label for="categoryFilter">Filter by Category:</label>
          <select id="categoryFilter" class="category-filter-select">
            <option value="all">All Categories</option>
            <option value="necklaces">Necklaces</option>
            <option value="crochet-necklaces">Crochet Necklaces</option>
            <option value="bracelets">Bracelets</option>
            <option value="hoop-earrings">Hoop Earrings</option>
            <option value="dangle-earrings">Dangle Earrings</option>
            <option value="unisex">Unisex</option>
            <option value="shalom-club">Shalom Club</option>
          </select>
        </div>
      </div>
      <div class="listproduct-format-main">
        <p>Products</p>
        <p>Title</p>
        <p>Price in $</p>
        <p>Price in ₪</p>
        <p>Category</p>
        <p>Quantity</p>
        <p>Remove</p>
      </div>
      <div class="listproduct-allproducts">
        <hr />
      </div>
    </div>`;

    pageContent.insertAdjacentHTML('afterbegin', markup);

    // Set the category filter to the stored category
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter && this.selectedCategory) {
      categoryFilter.value = this.selectedCategory;
    }

    // Load products with the current category filter
    this.loadProducts(data);
    this.addCategoryFilterHandler(data);
  };

  loadProducts = function (data) {
    const categoryFilter = document.getElementById('categoryFilter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';

    // Filter products based on selected category
    let filteredData = data;
    if (selectedCategory !== 'all') {
      filteredData = data.filter(
        product => product.category === selectedCategory
      );
    }

    const markup = filteredData
      .map(item => {
        return ` 
      <div data-id="${
        item.id
      }" class="listproduct-format-main listproduct-format">
        <img
        src="${item.image || item.mainImageUrl}"
        alt=""
        class="listproduct-product-icon"/>
        <p>${item.name}</p>
        <p>${item.usd_price}</p>
        <p>${item.ils_price}</p>
        <p>${item.category}</p>
        <p>${item.quantity}</p>
        <svg class="delete-svg">
          <use xlink:href="#delete-svg"></use>
        </svg>
        <button class="edit-btn">Edit</button>
       </div>
       <hr/>
        `;
      })
      .join('');

    const productList = document.querySelector('.listproduct-allproducts');
    productList.innerHTML = '<hr />';
    productList.insertAdjacentHTML('afterbegin', markup);

    productList.addEventListener('click', e => {
      const deleteBtn = e.target.closest('.delete-svg');
      const productId = e.target.closest('.listproduct-format').dataset.id;
      if (!deleteBtn) return;
      this.removeProduct(+productId);
    });
    this.testEdit();
  };

  testEdit = async function () {
    const editBtn = document.querySelector('.listproduct-allproducts');

    editBtn.addEventListener('click', async e => {
      const productId = e.target.closest('.listproduct-format').dataset.id;
      // const title = product.querySelector('.title').textContent
      const id = +productId;

      const response = await fetch(`${host}/findProduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: id }),
      });
      const respData = await response.json();

      this.editProductForm(respData.productData);
    });
  };

  editProductForm = async function (data) {
    if (!(await this.checkAuth())) return;
    this.clear();

    const markup = `<div class="add-product">
    <div class="addproduct-itemfield">
      <p>Product Title</p>
      <input 
        type="text"
        name="name"
        id="name"
        value="${data.name}"
      />
    </div>
    <div class="addproduct-price">
      <div class="addproduct-itemfield">
        <p>Price in $</p>
        <input
          type="text"
          name="usd_price"
          id="old-price"
          value="${data.usd_price}"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Security Margin (%)</p>
        <input
          type="number"
          name="security_margin"
          id="security-margin"
          value="${data.security_margin || 5}"
          min="0"
          max="100"
        />
      </div>
      <div class="addproduct-itemfield">
        <p>Price in ₪ (Auto-calculated)</p>
        <input
          type="text"
          name="ils_price"
          id="new-price"
          value="${data.ils_price}"
          readonly
        />
      </div>
    </div>
    <div class="addproduct-itemfield">
      <p>Product Description</p>
      <input
        type="text"
        name="description"
        id="description"
        value="${data.description}"
      />
    </div>
    <div class="addproduct-itemfield">
      <p>Product Category</p>
      <select
        name="category"
        id="category"
        class="add-product-selector"
      >
        <option value="necklaces">Necklaces</option>
        <option value="crochet-necklaces">Crochet Necklaces</option>
        <option value="bracelets">Bracelets</option>
        <option value="hoop-earrings">Hoop Earrings</option>
        <option value="dangle-earrings">Dangle Earrings</option>
        <option value="unisex">Unisex</option>
        <option value="shalom-club">Shalom Club</option>
      </select>
      <p>Quantity</p>
      <select
        name="quantity"
        id="quantity"
        class="quantity-selector"
      >
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
        <option value="7">7</option>
        <option value="8">8</option>
        <option value="9">9</option>
        <option value="10">10</option>
        <option value="11">11</option>
        <option value="12">12</option>
        <option value="13">13</option>
        <option value="14">14</option>
        <option value="15">15</option>
        <option value="16">16</option>
        <option value="17">17</option>
        <option value="18">18</option>
        <option value="19">19</option>
        <option value="20">20</option>
      </select>
    </div>
    <div class="addproduct-itemfield">
      <label for="mainImage">Main Image:</label>
      <input
        type="file"
        name="mainImage"
        id="mainImage"
      />
      <br>
      <label for="smallImages">Small Images:</label>
      <input
        type="file"
        name="smallImages"
        id="smallImages"
        multiple
      />
    </div>
    <button class="addproduct-btn">
      Update Product
    </button>
  </div>`;

    pageContent.insertAdjacentHTML('afterbegin', markup);

    // Set up event listeners for price calculation
    const usdPriceInput = document.getElementById('old-price');
    const securityMarginInput = document.getElementById('security-margin');

    if (usdPriceInput) {
      usdPriceInput.addEventListener('input', calculateILSPrice);
    }

    if (securityMarginInput) {
      securityMarginInput.addEventListener('input', calculateILSPrice);
    }

    // Set the selected category and quantity
    const categorySelect = document.getElementById('category');
    const quantitySelect = document.getElementById('quantity');

    if (categorySelect) {
      categorySelect.value = data.category;
    }

    if (quantitySelect) {
      quantitySelect.value = data.quantity;
    }

    this.updateProduct(data.id);
  };

  updateProduct = async function (id) {
    if (!(await this.checkAuth())) return;
    const addProductBtn = document.querySelector('.addproduct-btn');
    const form = document.querySelector('.add-product');

    addProductBtn.addEventListener('click', async e => {
      e.preventDefault();
      console.log('Starting product update...');

      try {
        const formData = new FormData();
        const mainImage = document.getElementById('mainImage').files[0];
        const smallImages = document.getElementById('smallImages').files;

        if (mainImage) {
          formData.append('mainImage', mainImage);
        }

        if (smallImages && smallImages.length > 0) {
          Array.from(smallImages).forEach(file => {
            formData.append('smallImages', file);
          });
        }

        // Upload images if any were selected
        let imageUrls = {};
        if (mainImage || (smallImages && smallImages.length > 0)) {
          const uploadResponse = await fetch(`${host}/upload`, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload images');
          }

          imageUrls = await uploadResponse.json();
        }

        // Prepare product data
        const productData = {
          id: id,
          name: document.getElementById('name').value,
          category: document.getElementById('category').value,
          quantity: document.getElementById('quantity').value,
          description: document.getElementById('description').value,
          oldPrice: document.getElementById('old-price').value,
          security_margin: document.getElementById('security-margin').value,
        };

        // Add image URLs if they were uploaded
        if (imageUrls.image) {
          productData.mainImageUrl = imageUrls.image;
        }
        if (imageUrls.smallImages) {
          productData.smallImagesUrl = imageUrls.smallImages;
        }

        console.log('Sending update request with data:', productData);

        // Update the product
        const response = await fetch(`${host}/updateproduct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          throw new Error('Failed to update product');
        }

        const result = await response.json();
        if (result.success) {
          alert('Product Updated Successfully!');
          this.fetchInfo();
        } else {
          alert('Failed to update product');
        }
      } catch (error) {
        console.error('Error updating product:', error);
        alert('Error updating product: ' + error.message);
      }
    });
  };

  addCategoryFilterHandler = function (allProducts) {
    const categoryFilter = document.getElementById('categoryFilter');
    const productsContainer = document.querySelector(
      '.listproduct-allproducts'
    );

    categoryFilter.addEventListener('change', e => {
      this.selectedCategory = e.target.value;
      let filteredProducts = allProducts;

      if (this.selectedCategory !== 'all') {
        filteredProducts = allProducts.filter(
          product => product.category === this.selectedCategory
        );
      }

      // Clear existing products
      productsContainer.innerHTML = '<hr />';

      // Load filtered products
      const markup = filteredProducts
        .map(item => {
          return ` 
          <div data-id="${
            item.id
          }" class="listproduct-format-main listproduct-format">
            <img
              src="${item.image || item.mainImageUrl}"
              alt=""
              class="listproduct-product-icon"/>
            <p>${item.name}</p>
            <p>${item.usd_price}</p>
            <p>${item.ils_price}</p>
            <p>${item.category}</p>
            <p>${item.quantity}</p>
            <svg class="delete-svg">
              <use xlink:href="#delete-svg"></use>
            </svg>
            <button class="edit-btn">Edit</button>
          </div>
          <hr/>
          `;
        })
        .join('');

      productsContainer.insertAdjacentHTML('afterbegin', markup);

      // Reattach event listeners for delete and edit buttons
      this.attachProductEventListeners(productsContainer);
    });
  };

  attachProductEventListeners = function (container) {
    container.addEventListener('click', e => {
      const deleteBtn = e.target.closest('.delete-svg');
      const editBtn = e.target.closest('.edit-btn');
      const productId = e.target.closest('.listproduct-format')?.dataset.id;

      if (deleteBtn && productId) {
        this.removeProduct(+productId);
      } else if (editBtn && productId) {
        this.testEdit();
      }
    });
  };
}

function calculateILSPrice() {
  const usdPrice = parseFloat(document.getElementById('old-price').value) || 0;
  const securityMargin =
    parseFloat(document.getElementById('security-margin').value) || 5;
  const exchangeRate = 3.7; // Base exchange rate

  // Calculate ILS price with security margin
  const ilsPrice = usdPrice * exchangeRate * (1 + securityMargin / 100);

  // Round to nearest integer
  document.getElementById('new-price').value = Math.round(ilsPrice);
}

export default new BisliView();
