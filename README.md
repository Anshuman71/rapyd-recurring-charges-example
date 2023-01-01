# Rapyd recurring payment example

This project is an example implementation for collecting monthly parking payments using Rapyd Collect API and Node.js

## Pre-requisites

1. Node.js and npm installed on the computer.
2. Code editor like VSCode.

## Setting up locally

1. Clone this repository
2. Run `npm install`
3. Create an account on [Rapyd](https://rapyd.net)
4. Open the [Rapyd Client Portal](https://dashboard.rapyd.net) in a web browser.
   ![Save access key and secret key](https://i.imgur.com/hj2e3MY.png)
5. Click **Developers**, on the left-navigation to open the Developers page.
6. Select, **Crednetials Details** on the Developers page.
7. Copy the _Access key_ and _Secret key_ using the copy button.
8. Create a new `.env` file in the project and paste both the values

```env
ACCESS_KEY=<copied-value>
SECRET_KEY=<copied-value>
```

## Running the server

Run `npm run dev` at the project root to start the server and open `http://localhost:3000` in a web browser.

## Get Support

- https://community.rapyd.net
- https://support.rapyd.net
