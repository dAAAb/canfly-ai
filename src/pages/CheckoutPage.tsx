import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import Navbar from '../components/Navbar'
import { Shield, Wrench, MessageCircle, CheckCircle, Clock } from 'lucide-react'

const PAYPAL_CLIENT_ID = 'AZS3MKnDpzJRBNbuvQhCYNbU9n9LAZ3xvQFNjhB0E5CnGfmjk4TdGTLURiIGVLl4pE5L4j6bELEqXKCi'
const SERVICE_PRICE = '50.00'
const SERVICE_CURRENCY = 'USD'

export default function CheckoutPage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useHead({
    title: t('meta.checkout.title'),
    description: t('meta.checkout.description'),
    canonical: `https://canfly.ai${localePath('/checkout')}`,
    ogType: 'website',
  })
  const [orderId, setOrderId] = useState<string | null>(null)

  if (paymentStatus === 'success') {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-600/20 border border-green-600 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              {t('checkout.successTitle')}
            </h1>
            <p className="text-gray-400 mb-2">
              {t('checkout.successMessage')}
            </p>
            {orderId && (
              <p className="text-sm text-gray-500">
                {t('checkout.orderId')}: {orderId}
              </p>
            )}
            <p className="text-gray-400 mt-6">
              {t('checkout.contactAfterPay')}
            </p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {t('checkout.title')}
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('checkout.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Service details */}
            <div className="space-y-6">
              {/* Service card */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-600/40 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {t('checkout.serviceName')}
                    </h2>
                    <p className="text-sm text-gray-400">{t('checkout.serviceTag')}</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      {t(`checkout.features.${i}`)}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  {t('checkout.deliveryTime')}
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex gap-4">
                <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900/40 p-4 text-center">
                  <Shield className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">{t('checkout.trustSecure')}</p>
                </div>
                <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900/40 p-4 text-center">
                  <MessageCircle className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">{t('checkout.trustSupport')}</p>
                </div>
              </div>
            </div>

            {/* Right: Payment */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
              <h3 className="text-lg font-semibold text-white mb-1">
                {t('checkout.orderSummary')}
              </h3>

              <div className="border-b border-gray-800 pb-4 mb-4">
                <div className="flex justify-between text-gray-300 text-sm py-2">
                  <span>{t('checkout.serviceName')}</span>
                  <span>${SERVICE_PRICE}</span>
                </div>
              </div>

              <div className="flex justify-between text-white font-semibold text-lg mb-6">
                <span>{t('checkout.total')}</span>
                <span>${SERVICE_PRICE} {SERVICE_CURRENCY}</span>
              </div>

              <PayPalScriptProvider options={{
                clientId: PAYPAL_CLIENT_ID,
                currency: SERVICE_CURRENCY,
                intent: 'capture',
              }}>
                <PayPalButtons
                  style={{
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal',
                    height: 48,
                  }}
                  createOrder={(_data, actions) => {
                    return actions.order.create({
                      intent: 'CAPTURE',
                      purchase_units: [{
                        description: 'CanFly White-Glove Setup Service',
                        amount: {
                          currency_code: SERVICE_CURRENCY,
                          value: SERVICE_PRICE,
                        },
                      }],
                    })
                  }}
                  onApprove={async (_data, actions) => {
                    if (!actions.order) return
                    const details = await actions.order.capture()
                    setOrderId(details.id ?? null)
                    setPaymentStatus('success')
                  }}
                  onError={() => {
                    setPaymentStatus('error')
                  }}
                />
              </PayPalScriptProvider>

              {paymentStatus === 'error' && (
                <p className="text-red-400 text-sm mt-3 text-center">
                  {t('checkout.errorMessage')}
                </p>
              )}

              <p className="text-xs text-gray-500 mt-4 text-center">
                {t('checkout.paypalNote')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
