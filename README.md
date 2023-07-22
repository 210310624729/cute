# Backend Setup instructions

## Dependent services

1. Email service to send otp upon signup for email verification:

Sendgrid : Free 100 emails/day.

2. Direction service used to find distance between pickup and drop of the customer to calculate the price of the trip.

MapQuest : Free 15000 requests per month

## Setup:

1. Run `npm install` in the root directory to install all dependent packages
2. create a `.env` file and paste the following

```
MONGO_URI = <Your database URI>
SENDGRID_API_KEY =<SENDGRID API KEY>
EMAIL_SENDER = <Verified SENDER EMAIL FOR SENDGRID>
ACCESS_TOKEN_SECRET = <ACCESS TOKEN SECRET>
REFRESH_TOKEN_SECRET = <REFRESH TOKEN SECRET>
MAPQUEST_API = <MAP QUEST API KEY>
MAIN_ADMIN_EMAIL = <Main admin's email>
MAIN_ADMIN_PASS = <Main admin's password>
```
Make sure you enter your values in the `.env` file


3. Start the backend using `node app.js` in root directory