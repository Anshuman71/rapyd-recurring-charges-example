require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;
const axios = require("axios");
const CryptoJS = require("crypto-js");

const accessKey = process.env.ACCESS_KEY;
const secretKey = process.env.SECRET_KEY;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Rapyd example!");
});

function createRequest(path, data, method) {
  const salt = CryptoJS.lib.WordArray.random(12);
  const timestamp = (Math.floor(new Date().getTime() / 1000) - 10).toString();
  let toSign = method + path + salt + timestamp + accessKey + secretKey;
  toSign = data ? toSign + JSON.stringify(data) : toSign;
  let signature = CryptoJS.enc.Hex.stringify(
    CryptoJS.HmacSHA256(toSign, secretKey)
  );

  signature = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(signature));
  const headers = {
    access_key: accessKey,
    signature,
    salt,
    timestamp,
    "Content-Type": `application/json`,
  };

  const request = {
    url: `https://sandboxapi.rapyd.net${path}`,
    headers,
    method,
  };
  if (data) {
    request["data"] = data;
  }
  return axios(request);
}

app.post("/add-customer", async (req, res) => {
  const { email, name } = req.body;
  const customerData = {
    email,
    name,
  };
  const createCustomerPath = "/v1/customers";
  try {
    const answer = await createRequest(
      createCustomerPath,
      customerData,
      "post"
    );
    const customerId = answer.data.data.id;
    const paymentMethodsEndpoint =
      "/v1/payment_methods/countries/IN?currency=USD";
    const methods = await createRequest(paymentMethodsEndpoint, null, "get");

    res.send(
      `
      <h1>Select payment method</h1>
      <form action="/add-method?customer=${customerId}" method="post">
      <select name="method_type">
    ${methods.data.data.map(
      (item) =>
        `<option value="${item.type}" name="${item.name}">${item.name}</option>`
    )} 
  </select>
  <button type="submit">Proceed</button>
  </form>`
    );
  } catch (e) {
    console.log(e);
    res.send("failed");
  }
});

app.post("/add-method", async (req, res) => {
  const { method_type } = req.body;
  const customerId = req.query.customer;

  const customerMethodEndpoint = `/v1/customers/${customerId}/payment_methods`;
  const methodRequiredFields = await createRequest(
    `/v1/payment_methods/required_fields/${method_type}`,
    null,
    "get"
  );
  const addPaymentMethod = await createRequest(
    customerMethodEndpoint,
    {
      customer: customerId,
      complete_payment_url: `http://localhost:3000/subscribe?customer=${customerId}&method_type=${method_type}`,
      error_payment_url: "https://google.com/error",
      fields: methodRequiredFields.data.data.fields,
      type: method_type,
    },
    "post"
  );
  console.log(addPaymentMethod);
  res.redirect(addPaymentMethod.data.data.redirect_url);
});

app.post("/subscribe", async (req, res) => {
  const customerId = req.query.customer;
  const subscriptionData = {
    customer: customerId,
    country: "us",
    billing: "pay_automatically",
    cancel_at_period_end: true,
    simultaneous_invoice: true,
    subscription_items: [
      {
        plan: "plan_af8a418da8f6d5b08af5d68e7021105d",
        quantity: 1,
      },
    ],
  };
  const checkoutPath = "/v1/checkout/subscription";
  const subsAnswer = await createRequest(
    checkoutPath,
    subscriptionData,
    "post"
  );
  const invoicePath = "/v1/invoices";
  await createRequest(
    invoicePath,
    { customer: customerId, subscription: subsAnswer.id },
    "post"
  );
});

app.get("/payment-methods", async (req, res) => {
  const checkoutPath = "/v1/payment_methods/countries/IN?currency=USD";
  const methods = await createRequest(checkoutPath, null, "get");
  res.send(methods.data.data);
});

app.get("/create-plan", async (req, res) => {
  const customerData = {
    currency: "USD",
    interval: "month",
    amount: 100,
    product: "product_cc6ee8ad8b44b2e4bc12521453ecc874",
  };
  const createCustomerPath = "/v1/plans";

  const answer = await createRequest(createCustomerPath, customerData, "post");
  res.send(answer.data.data);
});

app.listen(port, () => {
  console.log(`Rapyd app listening on port ${port}`);
});

// {
//     "id": "product_cc6ee8ad8b44b2e4bc12521453ecc874",
//     "active": true,
//     "attributes": [],
//     "created_at": 1672387959,
//     "description": "",
//     "images": [],
//     "metadata": {},
//     "name": "Monthly parking",
//     "package_dimensions": {
//     "height": 0,
//     "length": 0,
//     "weight": 0,
//     "width": 0
//     },
//     "shippable": false,
//     "skus": [],
//     "statement_descriptor": "",
//     "type": "services",
//     "unit_label": "",
//     "updated_at": 1672387959
//     }

// plan_d51d8340199d93faaaa105642fc87d7d
