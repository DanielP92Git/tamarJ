require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const baseUrl = process.env.PAYPAL_BASE_URL;

//
//* MAIN SETTINGS
//
const allowedOrigins = [
  `${process.env.HOST}`,
  `${process.env.API_URL}`,
  'http://localhost:1234', // Add Parcel dev server
  'http://localhost:4000', // Add backend server
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const app = express();
app.use(cors(corsOptions));

app.use(cookieParser());

// Endpoint to handle Stripe webhook
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (request, response) => {
    const sig = request.headers['stripe-signature'];
    const payload = request.body;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        `${process.env.WEBHOOK_SEC}`
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('2. From webhook:', session.metadata.productId);
      // Fulfill the purchase
      handleCheckoutSession(session);
    }

    response.json({ received: true });
  }
);

async function handleCheckoutSession(session) {
  const productId = session.metadata.productId; // Extract the actual product ID from session or metadata
  if (productId) {
    const product = await Product.findOne({ id: productId });
    if (product) {
      product.quantity -= 1;
      await product.save();
      let newQuantity = product.quantity;
      console.log(
        `Product ${productId} quantity reduced. New quantity: ${newQuantity}`
      );
      if (newQuantity == 0) {
        const response = await fetch(`${process.env.API_URL}/removeproduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: productId,
          }),
        });

        const data = await response.json();
        if (data.success) {
          console.log(`Product with id: ${data.id} is deleted from database`);
        }
      }
    }
  } else {
    console.error('Product not found');
  }
}

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '50mb' }));

//
//* CORS
//

function headers(req, res, next) {
  res.header('Access-Control-Allow-Origin', `${process.env.HOST}`);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, Content-Type, Authorization'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
}

app.options('*', headers);

app.use(headers);

//
//* MONGODB
//

// Database Connection With MongoDB
mongoose.connect(`${process.env.MONGO_URL}`);

// Schema Creating User Model
const Users = mongoose.model('Users', {
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match:
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
  },
  password: {
    type: String,
    required: true,
  },
  cartData: {
    type: Object,
  },
  Date: {
    type: Date,
    default: Date.now,
  },
  userType: {
    type: String,
    default: 'user',
  },
});

// Schema for Creating Products
const Product = mongoose.model('Product', {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: false,
  },
  image: {
    type: String,
    required: false,
  },
  imageLocal: {
    type: String,
    required: false,
  },
  smallImages: {
    type: Array,
    required: false,
  },
  smallImagesLocal: {
    type: Array,
    required: false,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  quantity: {
    type: Number,
    required: false,
  },
  ils_price: {
    type: Number,
    required: false,
  },
  usd_price: {
    type: Number,
    required: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
  security_margin: {
    type: Number,
    required: false,
  },
});

//
//* APIs
//

app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => res.send('API endpoint is running'));

app.get('/', (req, res) => {
  res.render('cart');
});

app.get('/admin', (req, res) => {
  // console.log("Fetch admin");
  res.sendFile(path.join(__dirname, 'html/bambaYafa.html')).status(200);
});

// Add product to database
app.post('/addproduct', async (req, res) => {
  try {
    // Get all products to determine next ID
    const products = await Product.find({}).sort({ id: -1 }).limit(1);
    let nextId = 1; // Default ID if no products exist

    if (products.length > 0) {
      // Ensure the last product's ID is a valid number
      const lastId = Number(products[0].id);
      if (!isNaN(lastId)) {
        nextId = lastId + 1;
      }
    }

    // Get security margin from request or use default 5%
    const securityMargin = parseFloat(req.body.security_margin) || 5;
    const exchangeRate = 3.7; // Base exchange rate

    // Calculate ILS price with security margin
    const usdPrice = Number(req.body.oldPrice) || 0;
    const ilsPrice = Math.round(
      usdPrice * exchangeRate * (1 + securityMargin / 100)
    );

    // Create new product with validated ID
    const product = new Product({
      id: nextId,
      name: req.body.name,
      image: req.body.image || req.body.mainImageUrl, // Handle both formats
      imageLocal: req.body.imageLocal,
      smallImages: req.body.multiImages || req.body.smallImagesUrl || [], // Handle both formats
      smallImagesLocal: req.body.multiImagesLocal || [],
      category: req.body.category,
      quantity: Number(req.body.quantity) || 0,
      description: req.body.description,
      ils_price: ilsPrice,
      usd_price: usdPrice,
      security_margin: securityMargin,
    });

    console.log('Saving product with data:', {
      id: nextId,
      name: req.body.name,
      image: req.body.image || req.body.mainImageUrl,
      smallImages: req.body.multiImages || req.body.smallImagesUrl || [],
      category: req.body.category,
      usd_price: usdPrice,
      ils_price: ilsPrice,
      security_margin: securityMargin,
    });

    await product.save();
    console.log('Product saved successfully with ID:', nextId);
    res.json({
      success: true,
      id: nextId,
      name: req.body.name,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/updateproduct', async (req, res) => {
  const id = req.body.id;
  const securityMargin = parseFloat(req.body.security_margin) || 5;
  const exchangeRate = 3.7; // Base exchange rate

  // Calculate ILS price with security margin
  const usdPrice = Number(req.body.oldPrice) || 0;
  const ilsPrice = Math.round(
    usdPrice * exchangeRate * (1 + securityMargin / 100)
  );

  const updatedFields = {
    name: req.body.name,
    ils_price: ilsPrice,
    usd_price: usdPrice,
    security_margin: securityMargin,
    description: req.body.description,
    quantity: req.body.quantity,
    category: req.body.category,
  };

  let product = await Product.findOne({ id: id });

  product.name = updatedFields.name;
  product.usd_price = updatedFields.usd_price;
  product.ils_price = updatedFields.ils_price;
  product.security_margin = updatedFields.security_margin;
  product.description = updatedFields.description;
  product.quantity = updatedFields.quantity;
  product.category = updatedFields.category;

  await product.save();

  res.json({
    success: true,
  });
});

// Delete products from database
app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log('Removed');
  res.json({
    success: true,
    id: req.body.id,
    name: req.body.name,
  });
});

// Get all products from database
app.get('/allproducts', async (req, res) => {
  let products = await Product.find({});
  console.log('All Products Fetched');
  res.send(products);
});

// app.post("/productsByCategory", async (req, res) => {
//   const category = req.body.category;
//   const page = req.body.page; // Default to page 1 if not specified
//   const limit = 6; // Number of products per page

//   try {
//     console.log(page);
//     const skip = (page - 1) * limit;

//     // Query products with pagination
//     let products = await Product.find({ category: category })
//       .skip(skip)
//       .limit(limit);

//     res.json(products);
//   } catch (error) {
//     console.error("Error fetching products by category:", error);
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// });

app.post('/productsByCategory', async (req, res) => {
  const category = req.body.category;
  const page = req.body.page;
  const limit = 6;

  try {
    console.log('Fetching products for category:', category);
    const skip = (page - 1) * limit;

    // Query products with pagination
    let products = await Product.find({ category: category })
      .skip(skip)
      .limit(limit);

    if (!products || products.length === 0) {
      return res.json([]); // Return empty array if no products found
    }

    res.json(products);
  } catch (err) {
    console.error('Error fetching products by category:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/chunkProducts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  let category = req.body.checkCategory;
  try {
    const products = await Product.find({ category: category })
      .skip(skip)
      .limit(limit);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products:', err });
  }
});

const authUser = async function (req, res, next) {
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
      const userTypeCheck =
        user.userType === 'user' || user.userType === 'admin';

      if (userTypeCheck) {
        bcrypt.compare(req.body.password, user.password, (err, result) => {
          if (err || !result) {
            return res
              .status(401)
              .json({ success: false, errors: 'Auth Failed' });
          }
          console.log('Authenticated successfuly');
          req.user = user;
          next();
        });
      } else {
        throw new Error('No access');
      }
    } else {
      res.status(404).json({
        errors:
          'No user found. Please check your email or password and try again',
      });
    }
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ errors: 'Auth User - Internal Server Error' });
  }
};

// Creating endpoint for login
app.post('/login', authUser, async (req, res) => {
  try {
    const adminCheck = req.user.userType;
    const data = {
      user: {
        id: req.user._id.toString(),
        email: req.user.email,
      },
    };
    const token = jwt.sign(data, process.env.JWT_KEY);
    if (token) {
      console.log('Token created for user:', req.user.email);
      res.json({
        success: true,
        token,
        adminCheck,
        message: 'Login successful',
      });
    }
  } catch (err) {
    console.error('Login Error🔥 :', err);
    res.status(500).json({
      success: false,
      errors: 'Login - Internal Server Error',
      message: err.message,
    });
  }
});

// Creating Endpoint for Registering the User
app.post('/signup', async (req, res) => {
  let findUser = await Users.findOne({ email: req.body.email });
  if (findUser) {
    return res.status(400).json({
      success: false,
      errors: 'Existing user found with the same Email address',
    });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }

  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({
        errors: err,
      });
    } else {
      const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: hash,
        cartData: cart,
      });
      user
        .save()
        .then(() => {
          // console.log(result);
          res.status(201).json({
            message: 'User Created!',
          });
        })
        .catch(err => {
          // console.log(err);
          res.status(500).json({
            errors: err,
          });
        });

      // const data = {
      //   user: {
      //     id: user.id,
      //   },
      // };

      // const token = jwt.sign(data, "secret_ecom");
      // res.json({ success: true, token });
    }
  });
});

// Creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    res.status(401).send({ errors: 'Please authenticate using valid token' });
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      req.user = decoded.user;
      next();
    } catch (err) {
      res
        .status(401)
        .send({ errors: 'Please authenticate using a valid token', err });
    }
  }
};

// Creating endpoint to get cartdata
app.post('/getcart', fetchUser, async (req, res) => {
  console.log('GetCart');
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

// Creating endpoint for adding products in cartdata

app.post('/addtocart', fetchUser, async (req, res) => {
  console.log('added', req.body.itemId);

  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Added!');
});

// Creating endpoint for removing products from cartdata

app.post('/removefromcart', fetchUser, async (req, res) => {
  console.log('removed', req.body.itemId);

  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Removed!');
});

app.post('/removeAll', fetchUser, async (req, res) => {
  console.log('removed all');
  let userData = await Users.findOne({ _id: req.user.id });

  for (let i = 0; i < 300; i++) {
    userData.cartData[i] = 0;
  }

  // userData.cartData[req.body.itemId] = 0;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Removed All!');
});

app.post('/findProduct', async (req, res) => {
  // console.log(req.body.id);
  let productData = await Product.findOne({ id: req.body.id });
  res.json({ productData });
});

// Image Storage Engine

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'mainImage') {
      cb(null, './uploads');
    }
    if (file.fieldname === 'smallImages') {
      cb(null, './smallImages');
    }
  },
  filename: function (req, file, cb) {
    return cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const uploadA = multer({ storage: storage });

const multipleUpload = uploadA.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'smallImages', maxCount: 8 },
]);

// Creating Upload endpoint for one image:
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('../../Online/backend/uploads', express.static('uploads'));

app.use('/smallImages', express.static(path.join(__dirname, 'smallImages')));
app.use('../../Online/backend/smallImages', express.static('smallImages'));

const copyFile = (source, target, cb) => {
  const rd = fs.createReadStream(source);
  const wr = fs.createWriteStream(target);

  rd.on('error', cb);
  wr.on('error', cb);
  wr.on('close', () => cb(null));

  rd.pipe(wr);
};

app.post('/upload', multipleUpload, async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Files:', req.files);

    if (!req.files || !req.files.mainImage) {
      console.error('No main image uploaded');
      return res.status(400).json({ error: 'No main image uploaded' });
    }

    const mainImage = req.files.mainImage[0];
    const smallImages = req.files.smallImages || [];

    // Copy main image to another directory
    if (mainImage) {
      const sourcePath = path.join(__dirname, './uploads', mainImage.filename);
      const targetPath = path.join(
        __dirname,
        '../../Online/backend/uploads',
        mainImage.filename
      );
      copyFile(sourcePath, targetPath, err => {
        if (err) console.error('Error copying main image:', err);
      });
    }

    // Copy small images to another directory
    smallImages.forEach(file => {
      const sourcePath = path.join(__dirname, './smallImages', file.filename);
      const targetPath = path.join(
        __dirname,
        '../../Online/backend/smallImages',
        file.filename
      );
      copyFile(sourcePath, targetPath, err => {
        if (err) console.error('Error copying small image:', err);
      });
    });

    // Use API_URL for production URLs
    const mainImageUrl = `${process.env.API_URL}/uploads/${mainImage.filename}`;
    const mainImageLocal = `http://localhost:4000/uploads/${mainImage.filename}`;

    const smallImagesUrl = smallImages.map(
      file => `${process.env.API_URL}/smallImages/${file.filename}`
    );
    const smallImagesLocal = smallImages.map(
      file => `http://localhost:4000/smallImages/${file.filename}`
    );

    console.log('Generated URLs:', {
      mainImageUrl,
      mainImageLocal,
      smallImagesUrl,
      smallImagesLocal,
    });

    res.json({
      success: true,
      image: mainImageUrl,
      imageLocal: mainImageLocal,
      smallImages: smallImagesUrl,
      smallImagesLocal: smallImagesLocal,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Creating payment endpoint
const stripe = require('stripe')(process.env.STRIPE_PUBLISH_KEY_TEST);

app.post('/create-checkout-session', async (req, res) => {
  // const shippingRate = await stripe.shippingRates.retrieve('shr_1P5Tdw03Qr2omCV4v8GI30UM')
  try {
    const [getProductId] = req.body.items;
    const product = await Product.find({ id: getProductId.id });
    let [getProdQuant] = product;
    let reqCurrency = req.body.currency;

    if (!product) {
      throw new Error('Product not found');
    }

    if (getProdQuant.quantity == 0) {
      return res.status(400).send('Product is out of stock');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: req.body.items.map(item => {
        // let inCents = item.price * 100;
        let inCents =
          reqCurrency == '$'
            ? item.price * 100
            : Number((item.price / `${process.env.USD_ILS_RATE}`).toFixed(0)) *
              100;

        const myItem = {
          name: item.title,
          price: inCents,
          quantity: item.amount,
          productId: item.id,
        };

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: myItem.name,
            },
            unit_amount: myItem.price,
          },
          quantity: myItem.quantity,
        };
      }),
      shipping_address_collection: {
        allowed_countries: ['US', 'IL'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1500,
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'week',
                value: 2,
              },
              maximum: {
                unit: 'week',
                value: 4,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 2000,
              currency: 'usd',
            },
            display_name: 'Expedited Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 10,
              },
              maximum: {
                unit: 'business_day',
                value: 12,
              },
            },
          },
        },
      ],

      success_url: `${process.env.HOST}/index.html`,
      cancel_url: `${process.env.HOST}/html/cart.ejs`,
      // customer_email: "test+location_US@example.com",
      metadata: {
        productId: getProductId.id.toString(), // .toString()??? Include the product ID in the session metadata
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('MISSING_API_CREDENTIALS');
    }
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Failed to generate Access Token:', error);
  }
};

const createOrder = async cart => {
  // use the cart information passed from the front-end to calculate the purchase unit details
  console.log(
    'shopping cart information passed from the frontend createOrder() callback:',
    cart
  );

  let totalAmount = cart
    .reduce((total, item) => {
      let itemTotal =
        parseFloat(item.unit_amount.value) * parseInt(item.quantity);
      return total + itemTotal;
    }, 0)
    .toFixed(2);

  const currencyData = cart[0].unit_amount.currency_code;

  const accessToken = await generateAccessToken();
  const url = `${baseUrl}/v2/checkout/orders`;
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currencyData,
          value: +totalAmount,
          breakdown: {
            item_total: {
              currency_code: currencyData,
              value: +totalAmount,
            },
          },
        },
        items: cart,
      },
    ],
    application_context: {
      return_url: `${process.env.API_URL}/complete-order`,
      cancel_url: `${process.env.HOST}/html/cart.html`,
      user_action: 'PAY_NOW',
      brand_name: 'Tamar Kfir Jewelry',
    },
  };
  console.log(payload.purchase_units[0].unit_amount);
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

const captureOrder = async orderID => {
  const accessToken = await generateAccessToken();
  const url = `${baseUrl}/v2/checkout/orders/${orderID}/capture`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
  });

  return handleResponse(response);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

app.post('/orders', async (req, res) => {
  try {
    // use the cart information passed from the front-end to calculate the order amount detals
    const { cart } = req.body;
    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

app.post('/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Failed to capture order.' });
  }
});

// Create endpoint for token verification
app.post('/verify-token', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    // Find the user by email (safer than comparing ObjectIDs)
    const user = await Users.findOne({
      email: decoded.user.email,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is admin
    if (user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin privileges required',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

app.listen(process.env.SERVER_PORT || 4000, error => {
  if (!error) {
    console.log('Server Running on Port ' + process.env.SERVER_PORT);
  } else {
    console.log('Error : ' + error);
  }
});
