import View from '../View.js';
// require('dotenv').config();

const addProductsBtn = document.querySelector('.sidebar_add-products');
const productsListBtn = document.querySelector('.sidebar_products-list');
const sideBar = document.querySelector('.sidebar');
const pageContent = document.querySelector('.page-content');
// const host = process.env.PARCEL_API_URL;
const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : `${window.location.protocol}//${window.location.host}/api`;

class BisliView extends View {
  constructor() {
    super();
    this.selectedCategory = 'all';
    this.checkAuth();
    this.addProductsBtn = document.querySelector('.sidebar_add-products');
    this.productsListBtn = document.querySelector('.sidebar_products-list');
  }

  checkAuth = async function () {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      console.log('No token found, showing login page');
      this.showLoginPage();
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/verify-token`, {
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
        this.showLoginPage();
        return false;
      }

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
        const response = await fetch(`${API_URL}/login`, {
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
    await fetch(`${API_URL}/login`, {
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
    await fetch(`${API_URL}/allproducts`)
      .then(res => res.json())
      .then(data => {
        this.loadProductsPage(data);
      });
  };

  async addProduct(e, data, form) {
    try {
      e.preventDefault();
      const mainImageFormData = new FormData();
      const mainImageInput = document.querySelector('#mainImage');
      const smallImagesInput = document.querySelector('#smallImages');

      if (!mainImageInput.files[0]) {
        throw new Error('Please select a main image');
      }

      mainImageFormData.append('mainImage', mainImageInput.files[0]);

      if (smallImagesInput.files.length > 0) {
        Array.from(smallImagesInput.files).forEach(file => {
          mainImageFormData.append('smallImages', file);
        });
      }

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: mainImageFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Image upload failed: ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      const isProduction = window.location.hostname !== 'localhost';
      const mainImageUrl = isProduction
        ? uploadData.image
        : uploadData.imageLocal;
      const smallImagesUrls = isProduction
        ? uploadData.smallImages
        : uploadData.smallImagesLocal;

      const formData = new FormData(form);
      const productData = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        quantity: formData.get('quantity'),
        ils_price: formData.get('ils_price'),
        usd_price: formData.get('usd_price'),
        image: mainImageUrl,
        smallImages: smallImagesUrls,
      };

      const response = await fetch(`${API_URL}/addproduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add product: ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        alert('Product added successfully!');
        form.reset();
        this.fetchInfo();
      } else {
        throw new Error(result.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert(error.message);
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
    try {
      // Delete the product
      const response = await fetch(`${API_URL}/removeproduct`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: id }),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`Product ${id} deleted successfully`);

        // Fetch all products again
        const productsResponse = await fetch(`${API_URL}/allproducts`);
        const data = await productsResponse.json();

        // Reload products with the current category filter
        this.loadProductsPage(data);

        // Restore category filter if it was previously set
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && this.selectedCategory !== 'all') {
          categoryFilter.value = this.selectedCategory;
          this.loadProducts(data);
        }
      } else {
        console.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
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
      <textarea
        name="description"
        id="description"
        placeholder="Type here"
        rows="4"
        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;"
      ></textarea>
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

    // Add event listeners for price calculation
    const usdPriceInput = document.getElementById('old-price');
    const securityMarginInput = document.getElementById('security-margin');

    if (usdPriceInput) {
      usdPriceInput.addEventListener('input', window.calculateILSPrice);
    }

    if (securityMarginInput) {
      securityMarginInput.addEventListener('input', window.calculateILSPrice);
    }

    // Calculate initial price if values are present
    window.calculateILSPrice();
  };

  loadProductsPage = async function (data) {
    if (!(await this.checkAuth())) return;
    this.clear();

    const markup = `
    <style>
      .product-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
      .edit-btn, .delete-btn {
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      .edit-btn {
        background-color: #4e54c8;
        color: white;
        border: none;
      }
      .delete-btn {
        background-color: #e74c3c;
        color: white;
        border: none;
      }
      .edit-btn:hover {
        background-color: #3f43a3;
      }
      .delete-btn:hover {
        background-color: #c0392b;
      }
      .bulk-actions {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        align-items: center;
      }
      .bulk-delete-btn {
        background-color: #e74c3c;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: none;
      }
      .bulk-delete-btn:hover {
        background-color: #c0392b;
      }
      .bulk-delete-btn.visible {
        display: block;
        align-self: center;
      }
      .select-all-container {
        display: flex;
        align-items: center;
        margin-top: 3rem;
        gap: 8px;
      }
      .product-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      .selected-count {
        margin-left: 10px;
        font-weight: bold;
      }
      .listproduct-format {
        padding: 15px 0;
        margin: 10px 0;
      }
      .listproduct-allproducts hr {
        margin: 0;
        border: none;
        border-top: 1px solid #eaeaea;
      }
      .list-product {
        margin-top: 20px;
      }
    </style>
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
      <div class="bulk-actions">
        <div class="select-all-container">
          <input type="checkbox" id="select-all" class="product-checkbox">
          <label for="select-all">Select All</label>
          <span class="selected-count" id="selected-count"></span>
        <button id="bulk-delete-btn" class="bulk-delete-btn">Delete Selected Items</button>
        </div>
      </div>
      <div class="listproduct-format-main">
        <p>Select</p>
        <p>Products</p>
        <p>Title</p>
        <p>Price in $</p>
        <p>Price in ₪</p>
        <p>Category</p>
        <p>Quantity</p>
        <p>Actions</p>
      </div>
      <div class="listproduct-allproducts">
        
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
    this.setupBulkActions();
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
        // Get the correct image URL based on environment
        const imageUrl =
          window.location.hostname === 'localhost'
            ? item.imageLocal || item.image
            : item.image;

        return ` 
      <div data-id="${item.id}" class="listproduct-format-main listproduct-format">
        <input type="checkbox" class="product-checkbox" data-id="${item.id}">
        <img
          src="${imageUrl}"
          alt="${item.name}"
          class="listproduct-product-icon"
          onerror="this.src='/images/no-image.png'"
        />
        <p>${item.name}</p>
        <p>${item.usd_price}</p>
        <p>${item.ils_price}</p>
        <p>${item.category}</p>
        <p>${item.quantity}</p>
        <div class="product-actions">
          <button class="edit-btn" data-id="${item.id}">Edit</button>
          <button class="delete-btn" data-id="${item.id}">Delete</button>
        </div>
       </div>
       <hr/>
        `;
      })
      .join('');

    const productList = document.querySelector('.listproduct-allproducts');
    productList.innerHTML = '';
    productList.insertAdjacentHTML('afterbegin', markup);

    // Add event listeners for delete and edit buttons
    this.attachProductEventListeners(productList);

    // Initialize checkboxes after loading products
    this.initCheckboxes();
  };

  testEdit = async function () {
    const editBtn = document.querySelector('.listproduct-allproducts');

    editBtn.addEventListener('click', async e => {
      const productId = e.target.closest('.listproduct-format').dataset.id;
      // const title = product.querySelector('.title').textContent
      const id = +productId;

      const response = await fetch(`${API_URL}/findProduct`, {
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
      <textarea
        name="description"
        id="description"
        value="${data.description}"
        rows="4"
        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;"
      ></textarea>
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
      usdPriceInput.addEventListener('input', window.calculateILSPrice);
    }

    if (securityMarginInput) {
      securityMarginInput.addEventListener('input', window.calculateILSPrice);
    }

    // Calculate initial price if values are present
    window.calculateILSPrice();

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
          const uploadResponse = await fetch(`${API_URL}/upload`, {
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
        const response = await fetch(`${API_URL}/updateproduct`, {
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
      productsContainer.innerHTML = '';

      // Load filtered products
      const markup = filteredProducts
        .map(item => {
          // Get correct image URL
          const imageUrl =
            window.location.hostname === 'localhost'
              ? item.imageLocal || item.image
              : item.image;

          return ` 
          <div data-id="${item.id}" class="listproduct-format-main listproduct-format">
            <input type="checkbox" class="product-checkbox" data-id="${item.id}">
            <img
              src="${imageUrl}"
              alt="${item.name}"
              class="listproduct-product-icon"
              onerror="this.src='/images/no-image.png'"
            />
            <p>${item.name}</p>
            <p>${item.usd_price}</p>
            <p>${item.ils_price}</p>
            <p>${item.category}</p>
            <p>${item.quantity}</p>
            <div class="product-actions">
              <button class="edit-btn" data-id="${item.id}">Edit</button>
              <button class="delete-btn" data-id="${item.id}">Delete</button>
            </div>
          </div>
          <hr/>
          `;
        })
        .join('');

      productsContainer.insertAdjacentHTML('afterbegin', markup);

      // Reattach event listeners for delete and edit buttons
      this.attachProductEventListeners(productsContainer);

      // Initialize checkboxes after filtering
      this.initCheckboxes();
    });
  };

  attachProductEventListeners = function (container) {
    // Handle delete button clicks
    const deleteButtons = container.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const productId = btn.dataset.id;
        if (confirm('Are you sure you want to delete this product?')) {
          this.removeProduct(+productId);
        }
      });
    });

    // Handle edit button clicks
    const editButtons = container.querySelectorAll('.edit-btn');
    editButtons.forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        const productId = btn.dataset.id;
        const response = await fetch(`${API_URL}/findProduct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: +productId }),
        });
        const respData = await response.json();
        this.editProductForm(respData.productData);
      });
    });
  };

  setupBulkActions = function () {
    const selectAllCheckbox = document.getElementById('select-all');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const selectedCountElement = document.getElementById('selected-count');

    // Handle "Select All" checkbox
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = selectAllCheckbox.checked;
        });
        this.updateSelectedCount();
      });
    }

    // Handle bulk delete button
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', async () => {
        const selectedIds = this.getSelectedProductIds();

        if (selectedIds.length === 0) {
          alert('No products selected');
          return;
        }

        if (
          confirm(
            `Are you sure you want to delete ${selectedIds.length} selected products?`
          )
        ) {
          await this.deleteMultipleProducts(selectedIds);
        }
      });
    }
  };

  initCheckboxes = function () {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => {
      if (checkbox.id !== 'select-all') {
        checkbox.addEventListener('change', () => {
          this.updateSelectedCount();
          this.updateSelectAllCheckbox();
        });
      }
    });

    // Initialize counters and status
    this.updateSelectedCount();
    this.updateSelectAllCheckbox();
  };

  updateSelectedCount = function () {
    const selectedIds = this.getSelectedProductIds();
    const selectedCountElement = document.getElementById('selected-count');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    if (selectedCountElement) {
      selectedCountElement.textContent =
        selectedIds.length > 0 ? `(${selectedIds.length} selected)` : '';
    }

    if (bulkDeleteBtn) {
      if (selectedIds.length > 0) {
        bulkDeleteBtn.classList.add('visible');
      } else {
        bulkDeleteBtn.classList.remove('visible');
      }
    }
  };

  updateSelectAllCheckbox = function () {
    const selectAllCheckbox = document.getElementById('select-all');
    const checkboxes = document.querySelectorAll(
      '.product-checkbox:not(#select-all)'
    );

    if (selectAllCheckbox && checkboxes.length > 0) {
      const allChecked = Array.from(checkboxes).every(
        checkbox => checkbox.checked
      );
      const someChecked = Array.from(checkboxes).some(
        checkbox => checkbox.checked
      );

      selectAllCheckbox.checked = allChecked;
      selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }
  };

  getSelectedProductIds = function () {
    const checkboxes = document.querySelectorAll(
      '.product-checkbox:not(#select-all):checked'
    );
    return Array.from(checkboxes).map(checkbox => +checkbox.dataset.id);
  };

  deleteMultipleProducts = async function (productIds) {
    if (!(await this.checkAuth())) return;

    try {
      // Create a loading indicator
      const loadingMsg = document.createElement('div');
      loadingMsg.textContent = `Deleting ${productIds.length} products...`;
      loadingMsg.style.cssText =
        'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 5px; z-index: 1000;';
      document.body.appendChild(loadingMsg);

      // Delete each product
      for (const id of productIds) {
        const response = await fetch(`${API_URL}/removeproduct`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        const result = await response.json();
        if (!result.success) {
          console.error(`Failed to delete product ${id}`);
        }
      }

      // Remove loading indicator
      document.body.removeChild(loadingMsg);

      // Show success message
      alert(`Successfully deleted ${productIds.length} products`);

      // Refresh the product list
      const productsResponse = await fetch(`${API_URL}/allproducts`);
      const data = await productsResponse.json();
      this.loadProductsPage(data);
    } catch (error) {
      console.error('Error deleting multiple products:', error);
      alert('Error deleting products: ' + error.message);
    }
  };
}

// Make calculateILSPrice available globally
window.calculateILSPrice = function () {
  const usdPrice = parseFloat(document.getElementById('old-price').value) || 0;
  const securityMargin =
    parseFloat(document.getElementById('security-margin').value) || 5;
  const exchangeRate = 3.7; // Base exchange rate

  // Calculate ILS price with security margin
  const ilsPrice = usdPrice * exchangeRate * (1 + securityMargin / 100);

  // Round to nearest integer
  document.getElementById('new-price').value = Math.round(ilsPrice);
};

// Original function kept for compatibility
function calculateILSPrice() {
  window.calculateILSPrice();
}

export default new BisliView();
