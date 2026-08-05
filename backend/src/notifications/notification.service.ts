import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EmailProvider, EmailMessage } from './interfaces/email-provider.interface'
import { EMAIL_PROVIDER_TOKEN } from './constants'

export interface OrderEmailItem {
  name: string
  sku?: string
  quantity: number
  price: string
}

export interface OrderBaseEmailContext {
  email: string
  customerName?: string
  orderNumber: string
  orderDate: string
  items: OrderEmailItem[]
  subtotal: string
  shippingCost: string
  total: string
  shippingMethod?: string
  orderUrl?: string
}

export interface ShipmentEmailContext extends OrderBaseEmailContext {
  trackingNumber: string
  trackingUrl?: string
  carrierName?: string
}

export interface DeliveryEmailContext extends OrderBaseEmailContext {
  deliveryDate: string
}

export interface RefundEmailContext extends OrderBaseEmailContext {
  refundAmount: string
  refundReason?: string
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)
  private readonly brandName: string
  private readonly frontendUrl: string
  private readonly supportEmail: string

  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly emailProvider: EmailProvider,
    private readonly config: ConfigService,
  ) {
    this.brandName = this.config.get<string>('BRAND_NAME') ?? 'Asteria Commerce'
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    this.supportEmail =
      this.config.get<string>('SUPPORT_EMAIL') ?? this.generateSupportEmail(this.frontendUrl, this.brandName)
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    options?: { name?: string },
  ): Promise<void> {
    const recipientName = options?.name ?? 'valued customer'
    const verificationUrl = this.buildFrontendLink('/auth/verify-email', { token })
    const subject = `Verify your ${this.brandName} account`

    const html = this.buildGenericHtml({
      heading: `Welcome to ${this.brandName}, ${recipientName}!`,
      body: `Thanks for creating an account. Click the button below to confirm that this is your email address.`,
      actionText: 'Verify my email',
      actionUrl: verificationUrl,
      footer: `If you didn’t create an account, you can safely ignore this message.`,
    })

    const text = this.buildGenericText({
      heading: `Welcome to ${this.brandName}, ${recipientName}!`,
      body: `Thanks for creating an account. Paste the link below in your browser to confirm your email: ${verificationUrl}`,
      actionText: 'Verify my email',
      actionUrl: verificationUrl,
      footer: `If you didn’t create an account, you can ignore this message. Need help? ${this.supportEmail}`,
    })

    await this.deliverMessage({ to: email, subject, html, text })
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    options?: { name?: string },
  ): Promise<void> {
    const recipientName = options?.name ?? 'friend'
    const resetUrl = this.buildFrontendLink('/auth/reset-password', { token })
    const subject = `Reset your ${this.brandName} password`

    const html = this.buildGenericHtml({
      heading: `Password reset request`,
      body: `Hi ${recipientName}, we received a request to reset your password. Use the button below to create a new one.`,
      actionText: 'Reset my password',
      actionUrl: resetUrl,
      footer: `If you did not request a password reset, please ignore this email or contact ${this.supportEmail}.`,
    })

    const text = this.buildGenericText({
      heading: `Password reset request`,
      body: `Hi ${recipientName}, we received a request to reset your password. Visit the link below to set a new password: ${resetUrl}`,
      actionText: 'Reset my password',
      actionUrl: resetUrl,
      footer: `If you did not request this, ignore this message or contact ${this.supportEmail}.`,
    })

    await this.deliverMessage({ to: email, subject, html, text })
  }

  async sendOrderConfirmationEmail(context: OrderBaseEmailContext): Promise<void> {
    const subject = `We received your ${this.brandName} order #${context.orderNumber}`
    const intro = `We’re processing your order and will update you as it ships.`
    const html = this.buildOrderNotificationHtml(context, intro, 'Order confirmed')
    const text = this.buildOrderNotificationText(context, intro, '')
    await this.deliverMessage({ to: context.email, subject, html, text })
  }

  async sendShipmentConfirmationEmail(context: ShipmentEmailContext): Promise<void> {
    const subject = `Your ${this.brandName} order #${context.orderNumber} is on the way`
    const intro = `Great news! Your order has shipped${context.carrierName ? ` via ${context.carrierName}` : ''}.`
    const extraHtml = this.buildTrackingSection(context)
    const extraText = this.buildTrackingText(context)
    const html = this.buildOrderNotificationHtml(context, intro, 'Order shipped', extraHtml)
    const text = this.buildOrderNotificationText(context, intro, extraText)
    await this.deliverMessage({ to: context.email, subject, html, text })
  }

  async sendDeliveryConfirmationEmail(context: DeliveryEmailContext): Promise<void> {
    const subject = `Delivered: ${this.brandName} order #${context.orderNumber}`
    const intro = `Your order was delivered on ${context.deliveryDate}. We hope you love it!`
    const html = this.buildOrderNotificationHtml(context, intro, 'Order delivered')
    const text = this.buildOrderNotificationText(context, intro, `Delivered: ${context.deliveryDate}`)
    await this.deliverMessage({ to: context.email, subject, html, text })
  }

  async sendRefundConfirmationEmail(context: RefundEmailContext): Promise<void> {
    const subject = `Refund issued for order #${context.orderNumber}`
    const intro = `We processed a refund of ${context.refundAmount} for your order.`
    const extraText = context.refundReason ? `Reason: ${context.refundReason}` : ''
    const html = this.buildOrderNotificationHtml(context, intro, 'Refund complete', `<p>${extraText}</p>`)
    const text = this.buildOrderNotificationText(context, intro, extraText)
    await this.deliverMessage({ to: context.email, subject, html, text })
  }

  private buildGenericHtml(payload: {
    heading: string
    body: string
    actionText: string
    actionUrl: string
    footer: string
  }): string {
    return `
      <div style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #111827;">
        <h2 style="margin-bottom: 8px;">${payload.heading}</h2>
        <p style="margin-bottom: 16px;">${payload.body}</p>
        <a
          href="${payload.actionUrl}"
          style="background: #1f2937; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"
        >
          ${payload.actionText}
        </a>
        <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">${payload.footer}</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 36px;">${this.brandName} • Need help? ${this.supportEmail}</p>
      </div>
    `
  }

  private buildGenericText(payload: {
    heading: string
    body: string
    actionText: string
    actionUrl: string
    footer: string
  }): string {
    return `${payload.heading}

${payload.body}

${payload.actionText}: ${payload.actionUrl}

${payload.footer}

${this.brandName} • Need help? ${this.supportEmail}`
  }

  private buildOrderNotificationHtml(
    context: OrderBaseEmailContext,
    intro: string,
    headline: string,
    extraHtml?: string,
  ): string {
    const orderUrl = this.resolveOrderUrl(context)
    return `
      <div style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #111827;">
        <p style="margin: 0 0 8px; color: #6b7280;">${headline}</p>
        <h2 style="margin: 0 0 16px;">Order #${context.orderNumber}</h2>
        <p style="margin: 0 0 12px;">${intro}</p>
        <p style="margin: 0 0 12px;">Order date: ${context.orderDate}</p>
        ${this.buildOrderItemsHtml(context.items)}
        <div style="margin-top: 16px;">
          <p>Subtotal: ${context.subtotal}</p>
          <p>Shipping: ${context.shippingCost}</p>
          <p style="font-weight: 600;">Total: ${context.total}</p>
        </div>
        ${extraHtml ?? ''}
        <p style="margin-top: 20px;">
          <a
            href="${orderUrl}"
            style="color: #2563eb; text-decoration: none;"
          >
            View order details
          </a>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 32px;">${this.brandName} • Need help? ${this.supportEmail}</p>
      </div>
    `
  }

  private buildOrderNotificationText(
    context: OrderBaseEmailContext,
    intro: string,
    extraText: string,
  ): string {
    const orderUrl = this.resolveOrderUrl(context)
    return `${context.customerName ? `Hi ${context.customerName},

` : ''}${intro}

Order date: ${context.orderDate}
${this.buildOrderItemsText(context.items)}
Subtotal: ${context.subtotal}
Shipping: ${context.shippingCost}
Total: ${context.total}
${extraText ? `${extraText}
` : ''}
View order details: ${orderUrl}

Need help? ${this.supportEmail}`
  }

  private buildOrderItemsHtml(items: OrderEmailItem[]): string {
    if (!items.length) {
      return '<p>No items were captured for this order.</p>'
    }

    const rows = items
      .map(
        (item) => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">× ${item.quantity}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.price}</td>
          </tr>
        `,
      )
      .join('')

    return `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
        <thead>
          <tr>
            <th align="left" style="padding-bottom: 8px;">Item</th>
            <th align="left" style="padding-bottom: 8px;">Qty</th>
            <th align="right" style="padding-bottom: 8px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `
  }

  private buildOrderItemsText(items: OrderEmailItem[]): string {
    if (!items.length) {
      return 'No items were captured for this order.'
    }

    return items
      .map((item) => `- ${item.quantity} × ${item.name} (${item.price})`)
      .join('\n')
  }

  private buildTrackingSection(context: ShipmentEmailContext): string {
    const trackingLinkHtml = context.trackingUrl
      ? `
        <p style="margin: 8px 0 0;">
          <a href="${context.trackingUrl}" style="color: #2563eb; text-decoration: none;">Track your package</a>
        </p>
      `
      : ''

    return `
      <div style="margin-top: 12px; padding: 12px; background: #f3f4f6; border-radius: 6px;">
        <p style="margin: 0;">Tracking #: ${context.trackingNumber}</p>
        ${context.shippingMethod ? `<p style="margin: 0;">Method: ${context.shippingMethod}</p>` : ''}
        ${trackingLinkHtml}
      </div>
    `
  }

  private buildTrackingText(context: ShipmentEmailContext): string {
    const lines = [`Tracking #: ${context.trackingNumber}`]
    if (context.shippingMethod) {
      lines.push(`Method: ${context.shippingMethod}`)
    }
    if (context.trackingUrl) {
      lines.push(`Track: ${context.trackingUrl}`)
    }
    return lines.join('\n')
  }

  private resolveOrderUrl(context: OrderBaseEmailContext): string {
    if (context.orderUrl) {
      return context.orderUrl
    }

    return this.buildFrontendLink(`/account/orders/${context.orderNumber}`)
  }

  private buildFrontendLink(path: string, query?: Record<string, string>): string {
    try {
      const url = new URL(path, this.frontendUrl)
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          url.searchParams.set(key, value)
        })
      }
      return url.toString()
    } catch (error) {
      const trimmedBase = this.frontendUrl.replace(/\/+$/, '')
      const trimmedPath = path.startsWith('/') ? path : `/${path}`
      const queryString = query ? `?${new URLSearchParams(query).toString()}` : ''
      return `${trimmedBase}${trimmedPath}${queryString}`
    }
  }

  private generateSupportEmail(frontendUrl: string, brandName: string): string {
    try {
      const host = new URL(frontendUrl).hostname
      return `support@${host}`
    } catch {
      const normalized = brandName.replace(/\s+/g, '').toLowerCase()
      return `support@${normalized || 'store'}.com`
    }
  }

  private async deliverMessage(message: EmailMessage): Promise<void> {
    try {
      await this.emailProvider.send(message)
      this.logger.log(`Transactional email sent to ${message.to} (${message.subject})`)
    } catch (error) {
      this.logger.error(
        `Failed to send transactional email to ${message.to}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
        message.subject,
      )
      throw new InternalServerErrorException('Unable to deliver transactional email at this time')
    }
  }
}
