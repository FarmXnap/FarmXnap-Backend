export type PaymentProviderTransactionStatus =
  | 'abandoned' // The customer hasn't completed the transaction.
  | 'failed' // The transaction failed.
  | 'ongoing' // The customer is currently trying to carry out an action to complete the transaction.
  | 'pending' // The transaction is currently in progress.
  | 'processing' // Same as pending, but for direct debit transactions.
  | 'queued' // The transaction has been queued to be processed later.
  | 'reversed' // The transaction was reversed (refunded or chargeback).
  | 'success' // The transaction was successfully processed.

export type PaymentProviderVerifyTransactionResponse = {
  status: boolean
  message: string
  data: {
    id: number
    domain: string
    status: PaymentProviderTransactionStatus
    reference: string
    receipt_number: string | null
    amount: number
    message: string | null
    gateway_response: string
    paid_at: string
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: unknown
    log: {
      start_time: number
      time_spent: number
      attempts: number
      errors: number
      success: boolean
      mobile: boolean
      input: unknown[]
      history: Array<{
        type: string
        message: string
        time: number
      }>
    }
    fees: number
    fees_split: unknown | null
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      channel: string
      card_type: string
      bank: string
      country_code: string
      brand: string
      reusable: boolean
      signature: string
      account_name: string | null
    }
    customer: {
      id: number
      first_name: string | null
      last_name: string | null
      email: string
      customer_code: string
      phone: string | null
      metadata: unknown | null
      risk_action: string
      international_format_phone: string | null
    }
    plan: unknown | null
    split: Record<string, unknown>
    order_id: string | null
    paidAt: string
    createdAt: string
    requested_amount: number
    pos_transaction_data: unknown | null
    source: unknown | null
    fees_breakdown: unknown | null
    connect: unknown | null
    transaction_date: string
    plan_object: Record<string, unknown>
    subaccount: Record<string, unknown>
  }
}

export type PaymentProviderChargeSuccessWebhookPayload = {
  event: 'charge.success'
  data: {
    id: number
    domain: string
    status: string
    reference: string
    amount: number
    message: string | null
    gateway_response: string
    paid_at: string
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: any
    log: {
      time_spent: number
      attempts: number
      authentication: string
      errors: number
      success: boolean
      mobile: boolean
      input: any[]
      channel: string | null
      history: Array<{
        type: string
        message: string
        time: number
      }>
    }
    fees: number | null
    customer: {
      id: number
      first_name: string
      last_name: string
      email: string
      customer_code: string
      phone: string | null
      metadata: any
      risk_action: string
    }
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      card_type: string
      bank: string
      country_code: string
      brand: string
      account_name: string
    }
    plan: Record<string, any>
  }
}
