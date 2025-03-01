# PayNow Integration Demo

A simple demonstration of PayNow integration in a Next.js e-commerce application.

## Code Flow

To understand the payment integration flow, review these files in order:

```mermaid
graph TD
    A[types.ts] --> B[checkout.tsx]
    B --> C[services/paynow.ts]
    C --> D[api/payment/initiate.ts]
    D --> E[api/payment/update.ts]
```

Key Files:
1. `src/types/types.ts` - Core type definitions
2. `src/pages/checkout.tsx` - Payment UI and form handling
3. `src/services/paynow.ts` - PayNow integration logic
4. `src/pages/api/payment/initiate.ts` - Payment initialization
5. `src/pages/api/payment/update.ts` - Payment status updates

## Mobile Money Express Checkout

Mobile payments (EcoCash and OneMoney) are processed without redirecting to PayNow's website. Instead:
1. User enters their mobile number
2. Payment request is sent to their phone
3. User approves payment on their device
4. Status updates are shown in real-time

## Test Mode

When testing the integration, PayNow provides specific test phone numbers that simulate different scenarios:

| Test Number | Scenario | Description | Status |
|------------|----------|-------------|---------|
| 0771111111 | Success | Payment succeeds after 5 seconds | ✅ Working |
| 0774444444 | Insufficient | Immediate failure due to insufficient balance | ✅ Working |
| 0772222222 | Delayed | Payment succeeds after 30 seconds | ⚠️ Unhandled |
| 0773333333 | Cancelled | Payment fails after 30 seconds | ⚠️ Unhandled |

**Important Notes:**
- In test mode, only the merchant account email can complete transactions
- The email used must match your merchant account email
- Test mode is enabled by default for new integrations

## Environment Variables

```ini
# PayNow Integration
NEXT_PUBLIC_PAYNOW_INTEGRATION_ID=your_integration_id
NEXT_PUBLIC_PAYNOW_INTEGRATION_KEY=your_integration_key
NEXT_PUBLIC_PAYNOW_MERCHANT_EMAIL=your_merchant_email

# Payment URLs
PAYNOW_RESULT_URL=http://localhost:3000/api/payment/update
PAYNOW_RETURN_URL=http://localhost:3000/payment/success
```

## Payment Flow

1. **Customer Checkout**
   - Customer adds items to cart
   - Fills in their details at checkout
   - Chooses payment method (Web or Mobile Money)

2. **Web Payment Flow**
   ```js
   // Create payment on PayNow
   const payment = paynow.createPayment(reference, email);
   
   // Add items
   payment.add("Product Name", price);
   
   // Get payment URL
   const response = await paynow.send(payment);
   
   // Redirect customer
   window.location.href = response.redirectUrl;
   ```

3. **Mobile Money Flow**
   ```js
   // Create payment on PayNow
   const payment = paynow.createPayment(reference, email);
   
   // Add items
   payment.add("Product Name", price);
   
   // Send to mobile money
   const response = await paynow.sendMobile(
     payment, 
     phoneNumber, 
     'ecocash'
   );
   
   // Show instructions to customer
   alert(response.instructions);
   ```

4. **Payment Updates**
   - PayNow sends payment status to: `/api/payment/update`
   - Success redirects to: `/payment/success`
   - Failures redirect to: `/payment/failed`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add PayNow credentials in `.env.local`:
   ```
   NEXT_PUBLIC_PAYNOW_INTEGRATION_ID=YOUR_ID
   NEXT_PUBLIC_PAYNOW_INTEGRATION_KEY=YOUR_KEY
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Testing

Use PayNow's test environment with these configurations:

```ini
# In .env.local
NEXT_PUBLIC_PAYNOW_TEST_MODE=true
```

Test using:
- Quick Success: `0771111111`
- Insufficient Balance: `0774444444`

Note: Delayed Success and User Cancelled scenarios are currently unhandled.

## Mobile Money Testing
The system will automatically use test numbers from your environment variables when in development mode.

## Learn More

- [PayNow Documentation](https://developers.paynow.co.zw/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## Payment Flow Architecture

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant PaynowService
    participant PayNowGateway

    Client->>API: POST /api/payment/initiate
    API->>PaynowService: initiatePayment()
    PaynowService->>PayNowGateway: Create payment request
    PayNowGateway-->>PaynowService: Payment response
    PaynowService-->>API: Payment details
    API-->>Client: Redirect URL/Poll URL
    
    alt Web Payment
        Client->>PayNowGateway: Redirect user
    else Mobile Money
        Client->>API: Poll status
        API->>PaynowService: checkPaymentStatus()
        PaynowService->>PayNowGateway: Poll status
        PayNowGateway-->>PaynowService: Payment status
        PaynowService-->>API: Status update
        API-->>Client: Payment result
    end
```

## Key Components

### 1. Payment Initiation (`/api/payment/initiate`)
- Handles both web and mobile payments
- Validates request payload
- Converts cart items to PayNow format
- Returns payment redirect URL or mobile instructions

### 2. Payment Update Webhook (`/api/payment/update`)
- Receives PayNow payment status updates
- Verifies payment authenticity
- Updates order status in database
- Triggers confirmation emails

### 3. Paynow Service (`services/paynow.ts`)
Core payment processing logic:
- `initiateWebPayment()`: Credit card/bank payments
- `initiateMobilePayment()`: Mobile money payments
- `checkPaymentStatus()`: Poll payment status
- Handles currency conversions (USD to cents)
- Generates unique transaction references

### 4. Checkout Components
- `pages/checkout.tsx`: Payment form UI
- `pages/payment/success.tsx`: Success page
- `pages/payment/failed.tsx`: Failed payment page

## Error Handling
- Automatic retries for network errors
- Detailed error logging
- User-friendly error messages
- Fallback UI states
- Transaction status verification

## Security
- All sensitive operations server-side
- HTTPS enforced
- Payment data never stored
- CSRF protection
- Input validation
- Secure credential storage
