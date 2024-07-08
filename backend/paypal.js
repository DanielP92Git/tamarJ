const baseUrl = process.env.PAYPAL_BASE_URL;
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET;
const credentials = btoa(`${clientId}:${clientSecret}`);

async function generateAcessToken() {
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  return data.access_token;
}

exports.createOrder = async () => {
  const accessToken = await generateAcessToken();

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          items: [
            {
              name: "name",
              description: "description",
              quantity: 1,
              unit_amount: {
                currency_code: "ILS",
                value: "100.00",
              },
            },
          ],

          amount: {
            currency_code: "ILS",
            value: "100.00",
            breakdown: {
              item_total: {
                currency_code: "ILS",
                value: "100.00",
              },
            },
          },
        },
      ],

      application_context: {
        return_url: `${process.env.API_URL}/complete-order`,
        cancel_url: `${process.env.HOST}/html/cart.html`,
        shipping_reference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        brand_name: "Tamar Kfir Jewelry",
      },
    }),
  });
  const data = await response.json();
  return data.links.find((link) => link.rel === "approve").href;
};

exports.capturePayment = async (orderId) => {
  try {
    const accessToken = await generateAcessToken();
    const response = await fetch(
      `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("🔥Error:", error);
  }
};
