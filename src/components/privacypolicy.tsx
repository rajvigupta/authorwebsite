export function PrivacyPolicyContent() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-cream-dark italic">
        Last Updated: January 2026
      </p>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">1. Introduction</h3>
        <p className="leading-relaxed">
          MemoryCraver ("we," "us," or "our") is committed to protecting your privacy. This Privacy 
          Policy explains how we collect, use, and safeguard your personal information when you use 
          our platform.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">2. Information We Collect</h3>
        
        <h4 className="text-lg font-lora text-gold-bright mb-2 mt-4">Account Information</h4>
        <p className="leading-relaxed mb-2">When you create an account, we collect:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Full name</li>
          <li>Email address</li>
          <li>Password (encrypted and hashed)</li>
          <li>Security question and answer (hashed)</li>
        </ul>

        <h4 className="text-lg font-lora text-gold-bright mb-2 mt-4">Purchase Information</h4>
        <p className="leading-relaxed mb-2">When you make purchases, we collect:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Transaction details (chapter purchased, amount paid)</li>
          <li>Payment information (processed securely by Razorpay - we do NOT store card details)</li>
          <li>Razorpay transaction IDs for verification</li>
        </ul>

        <h4 className="text-lg font-lora text-gold-bright mb-2 mt-4">Usage Information</h4>
        <p className="leading-relaxed mb-2">We automatically collect:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Chapters you've purchased and accessed</li>
          <li>Comments and votes on content</li>
          <li>Reading preferences (theme, font size, line spacing)</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">3. How We Use Your Information</h3>
        <p className="leading-relaxed mb-2">We use your information to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Provide access to your account and purchased content</li>
          <li>Process payments and verify transactions</li>
          <li>Protect content through email watermarking</li>
          <li>Enable password recovery via security questions</li>
          <li>Allow you to comment and interact with content</li>
          <li>Improve our platform and user experience</li>
          <li>Prevent fraud and unauthorized access</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">4. Data Storage & Security</h3>
        <p className="leading-relaxed mb-2">
          <strong className="text-gold">Storage:</strong> Your data is securely stored on Supabase 
          servers with industry-standard encryption.
        </p>
        <p className="leading-relaxed mb-2">
          <strong className="text-gold">Security Measures:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Passwords are hashed and encrypted</li>
          <li>Security answers are hashed for recovery</li>
          <li>HTTPS encryption for all data transmission</li>
          <li>Row-level security on database</li>
          <li>Email watermarking on all purchased content</li>
        </ul>
        <p className="leading-relaxed mt-2">
          While we implement strong security measures, no system is 100% secure. You are responsible 
          for keeping your password confidential.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">5. Third-Party Services</h3>
        
        <h4 className="text-lg font-lora text-gold-bright mb-2 mt-4">Razorpay (Payment Processing)</h4>
        <p className="leading-relaxed">
          We use Razorpay to process payments. Razorpay collects and processes your payment information 
          according to their own privacy policy. We do not store your credit card or banking details.
        </p>

        <h4 className="text-lg font-lora text-gold-bright mb-2 mt-4">Supabase (Database & Authentication)</h4>
        <p className="leading-relaxed">
          Our platform is built on Supabase infrastructure. Your data is stored on their secure servers 
          in accordance with their privacy standards.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">6. Email Watermarking</h3>
        <p className="leading-relaxed">
          To protect intellectual property, we embed your email address as a watermark on all purchased 
          content (both PDFs and text chapters). This helps us identify the source of any unauthorized 
          distribution. Your email is visible only to you and is displayed subtly to not disrupt reading.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">7. Cookies & Local Storage</h3>
        <p className="leading-relaxed">
          We use browser localStorage to save your preferences (theme choice, font size, line spacing). 
          This data stays on your device and is not transmitted to our servers.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">8. Data Sharing</h3>
        <p className="leading-relaxed mb-2">
          We do NOT sell, rent, or share your personal information with third parties, except:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>With Razorpay for payment processing</li>
          <li>When required by law or legal process</li>
          <li>To protect our rights or prevent fraud</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">9. Your Rights</h3>
        <p className="leading-relaxed mb-2">You have the right to:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Access your personal data</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your account and data</li>
          <li>Withdraw consent (where applicable)</li>
          <li>Object to data processing</li>
        </ul>
        <p className="leading-relaxed mt-2">
          To exercise these rights, contact us through the Contact Support option.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">10. Data Retention</h3>
        <p className="leading-relaxed">
          We retain your account information as long as your account is active. Purchase records are 
          kept for legal and accounting purposes. If you delete your account, we will remove your 
          personal data within 30 days, except where required by law.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">11. Children's Privacy</h3>
        <p className="leading-relaxed">
          Our platform is not intended for users under 13 years of age. We do not knowingly collect 
          personal information from children under 13.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">12. Changes to Privacy Policy</h3>
        <p className="leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of significant 
          changes by email or through the platform. Continued use after changes indicates acceptance.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-cinzel text-gold mb-3">13. Contact Us</h3>
        <p className="leading-relaxed">
          For privacy-related questions or to exercise your rights, please contact us through the 
          Contact Support option in the footer.
        </p>
      </section>

      <div className="mt-8 pt-6 border-t border-gold/20 text-center">
        <p className="text-sm text-cream-dark italic">
          This Privacy Policy is effective as of January 2026 and governs our data practices.
        </p>
      </div>
    </div>
  );
}