import { useEffect } from "react";

// Public privacy policy for the AgroTrack app (Play Store / App Store listing URL). Shown without signing in.
const EFFECTIVE_DATE = "9 November 2026";
const CONTACT_EMAIL = "support@skillinnovex.in";
const OPERATOR = "AgroTrack";

const SECTIONS = [
  {
    id: "about",
    title: "About this policy",
    body: (
      <>
        <p>
          This privacy policy explains how {OPERATOR} (“we”, “us”) collects, uses, shares and protects personal data when you use the
          AgroTrack mobile app and its related services (together, the “Service”). The Service lets farmers book tractors, buy farm
          products in the Anaj Mandi marketplace and ask Agri Doctor for crop advice, and lets tractor vendors, their drivers and
          shopkeepers offer those services.
        </p>
        <p>
          We process personal data in line with the Digital Personal Data Protection Act, 2023 and other applicable laws of India. By
          creating an account or using the Service, you agree to the processing described here. If you do not agree, please do not use
          the Service.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "Information we collect",
    body: (
      <>
        <h3>Information you give us</h3>
        <ul>
          <li><b>Account details:</b> your name, email address, mobile number, password (stored only as a secure hash) and your role (farmer, vendor, driver or shopkeeper).</li>
          <li><b>Profile photo</b>, if you add one.</li>
          <li><b>Addresses and farm locations</b> you save or enter for bookings and deliveries.</li>
          <li><b>Listings:</b> tractor and product details, prices, service areas and photos added by vendors and shopkeepers.</li>
          <li><b>Bookings and orders:</b> service dates, farm area, items, quantities, delivery address, notes and status history.</li>
          <li><b>Agri Doctor cases:</b> photos of crops or soil and the description of the problem you send for advice.</li>
          <li><b>Payout details (vendors and shopkeepers only):</b> account holder name, bank account number and IFSC or UPI ID, and PAN, provided to receive online payments.</li>
          <li><b>Messages to support</b> and any other information you choose to share with us.</li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li><b>Location:</b> with your permission, your device’s location is used to find tractors that can reach your farm, show distances and local weather. You can refuse location access and choose a place by hand instead.</li>
          <li><b>Transaction records:</b> payment and payout status, amounts, platform fee, refund status and payment reference numbers.</li>
          <li><b>Technical data:</b> basic server logs such as IP address, request time and error details, used to keep the Service secure and working.</li>
        </ul>
        <h3>Information from payment partners</h3>
        <p>
          When you pay online, our payment partner Cashfree Payments tells us whether the payment succeeded, the payment method type
          (for example UPI or card) and a payment reference. We <b>never receive or store your full card number, CVV, UPI PIN or net-banking
          password</b>.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use your information",
    body: (
      <ul>
        <li>To create and manage your account and let you sign in securely.</li>
        <li>To run bookings, orders and deliveries, including matching farmers with tractors and sellers by distance.</li>
        <li>To process online payments, Premium subscriptions, refunds and payouts to vendors and shopkeepers, and to calculate the platform fee.</li>
        <li>To verify payout accounts with our payment partner, as required for settlements.</li>
        <li>To review Agri Doctor cases and send you crop and soil advice.</li>
        <li>To send notifications about your bookings, orders, payments and account.</li>
        <li>To provide support, resolve disputes and handle refunds.</li>
        <li>To keep the Service secure, prevent fraud and misuse, and keep records of administrative actions.</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>
    ),
  },
  {
    id: "share",
    title: "How we share your information",
    body: (
      <>
        <p>We do <b>not</b> sell your personal data and we do not show third-party advertising. We share data only as follows:</p>
        <ul>
          <li><b>With other users, only as needed to complete a job:</b> a vendor and the assigned driver see the farmer’s name, phone number, farm location and booking details; a shopkeeper sees the buyer’s name, phone number and delivery address; farmers see the name and contact details of the vendor or shopkeeper they deal with.</li>
          <li><b>Cashfree Payments</b> (an RBI-authorised payment aggregator) to process payments, refunds and payouts, and to verify vendor and shopkeeper payout accounts. Full bank account numbers and PAN are sent to Cashfree for this purpose; AgroTrack keeps only masked copies (for example ••••1234).</li>
          <li><b>Google (Gemini AI)</b>, when our team uses AI assistance to analyse Agri Doctor photos and descriptions to help prepare advice. Only the case photos and description are sent, not your contact details.</li>
          <li><b>Service providers</b> that host our servers and database and help us operate the Service, under confidentiality obligations.</li>
          <li><b>Authorities</b>, when required by law, court order or to protect the rights, safety and property of our users or the public.</li>
        </ul>
      </>
    ),
  },
  {
    id: "permissions",
    title: "App permissions",
    body: (
      <ul>
        <li><b>Location</b> – to match tractors and bookings by distance and show local weather. Optional; you can set a place by hand.</li>
        <li><b>Camera and photos</b> – to add a profile photo, tractor and product photos, and Agri Doctor photos. Photos are uploaded only when you choose them.</li>
        <li><b>Notifications</b> – to tell you about bookings, orders and payments.</li>
        <li><b>Installed UPI apps</b> – to let you pay with a UPI app of your choice during checkout.</li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect your information",
    body: (
      <ul>
        <li>All data travels over encrypted HTTPS connections.</li>
        <li>Passwords are stored only as secure hashes, and your sign-in on the phone is kept in the device’s secure storage.</li>
        <li>Full bank account numbers and PAN are never stored by AgroTrack, shown in the app or written to logs.</li>
        <li>Payments are confirmed directly with our payment partner, and access to administrative tools is limited by role and recorded in an audit log.</li>
      </ul>
    ),
  },
  {
    id: "retention",
    title: "How long we keep information",
    body: (
      <p>
        We keep your account information while your account is active. If you ask us to delete your account, we delete or anonymise your
        personal data within 30 days, except records we must keep by law — such as payment, invoice and tax records, which are kept for the
        period required by Indian tax and accounting laws — and information needed to resolve disputes or prevent fraud.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights and choices",
    body: (
      <>
        <p>Under the Digital Personal Data Protection Act, 2023, you can:</p>
        <ul>
          <li>Ask for a summary of the personal data we hold about you and how it is used.</li>
          <li>Correct or update your details — most can be changed in the app under Profile.</li>
          <li>Ask us to delete your account and personal data.</li>
          <li>Withdraw your consent at any time (this may stop parts of the Service from working).</li>
          <li>Nominate another person to exercise these rights on your behalf in case of death or incapacity.</li>
          <li>Raise a grievance with us, and if it is not resolved, with the Data Protection Board of India.</li>
        </ul>
        <p>
          To use any of these rights, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email address or include the mobile
          number registered on your account. We will respond within the time required by law.
        </p>
      </>
    ),
  },
  {
    id: "delete",
    title: "Deleting your account",
    body: (
      <p>
        To delete your AgroTrack account and its data, email <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20AgroTrack%20account`}>{CONTACT_EMAIL}</a> with
        the subject “Delete my AgroTrack account” from your registered email address, or include your registered mobile number. Bookings or
        orders that are in progress or have pending payments, refunds or payouts are settled first.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The Service is meant for people aged 18 and over. We do not knowingly collect personal data from children. If you believe a child has
        given us personal data, please contact us and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. When we do, we will change the effective date at the top of this page and, for
        significant changes, notify you in the app.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact and grievance officer",
    body: (
      <p>
        For questions, requests or complaints about your personal data, contact our Grievance Officer at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  useEffect(() => { document.title = "Privacy Policy · AgroTrack"; }, []);
  return (
    <div className="min-h-screen bg-[#f3f5f9] text-gray-700">
      <header className="bg-sidebar-bg">
        <div className="max-w-4xl mx-auto px-5 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white"><i className="fa-solid fa-tractor text-sm" /></div>
          <span className="text-white font-bold text-lg tracking-tight">AgroTrack</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-2">Effective date: {EFFECTIVE_DATE}</p>
        <nav aria-label="Contents" className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mt-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm list-decimal list-inside">
            {SECTIONS.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-blue-600 hover:underline">{s.title}</a></li>
            ))}
          </ol>
        </nav>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-8 mt-6 policy">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2>{i + 1}. {s.title}</h2>
              {s.body}
            </section>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-8">© {new Date().getFullYear()} {OPERATOR}. All rights reserved.</p>
      </main>
    </div>
  );
}
