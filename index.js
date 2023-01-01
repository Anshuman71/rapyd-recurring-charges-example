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

function makeRequest(path, data, method) {
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
  const paymentMethodsEndpoint =
    "/v1/payment_methods/countries/IN?currency=USD";
  try {
    const { email, name } = req.body;

    const methods = await makeRequest(paymentMethodsEndpoint, null, "get");

    res.send(
      `
      <h1>Select payment method</h1>
      <form action="/add-payment-method?email=${email}&name=${name}" method="post">
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
    res.send("Something went wrong.");
  }
});

app.post("/add-payment-method", async (req, res) => {
  const { method_type } = req.body;
  const { email, name } = req.query;
  const methodRequiredFields = await makeRequest(
    `/v1/payment_methods/required_fields/${method_type}`,
    null,
    "get"
  );

  res.send(
    `
    <h1>Payment method information</h1>
    <form action="/subscribe?email=${email}&name=${name}&method_type=${method_type}" method="post">
  ${methodRequiredFields.data.data.fields
    .map(
      (item) =>
        `<input placeholder="${item.instructions}" name="${item.name}"/>`
    )
    .join("<br />")} 
    <br />
<button type="submit">Proceed</button>
</form>`
  );
});

app.post("/subscribe", async (req, res) => {
  const { email, name, method_type } = req.query;
  const customerData = {
    email,
    name,
    payment_method: {
      fields: req.body,
      type: method_type,
      complete_payment_url: "https://complete.rapyd.net",
      error_payment_url: "https://error.rapyd.net",
    },
  };
  const createCustomerPath = "/v1/customers";
  const answer = await makeRequest(createCustomerPath, customerData, "post");
  const customerId = answer.data.data.id;
  const subscriptionPayload = {
    customer: customerId,
    country: "in",
    billing: "pay_automatically",
    payment_method: answer.data.data.default_payment_method,
    subscription_items: [
      {
        plan: "plan_af8a418da8f6d5b08af5d68e7021105d",
        quantity: 1,
      },
    ],
  };
  const checkoutPath = "/v1/checkout/subscription";
  const subsAnswer = await makeRequest(
    checkoutPath,
    subscriptionPayload,
    "post"
  );
  const subscriptionData = subsAnswer.data.data;
  console.log("Sub Answer ", subscriptionData);
  res.redirect(subscriptionData.redirect_url);
});

app.listen(port, () => {
  console.log(`Rapyd app listening on port ${port}`);
});
