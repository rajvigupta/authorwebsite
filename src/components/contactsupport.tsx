import { Mail, User, Code2, BookOpen, MessageCircle, Bug } from 'lucide-react';

export function ContactSupportContent() {
  return (
    <div className="space-y-8">
      <p className="text-center text-cream-dark italic leading-relaxed">
        Need help? Have questions? We're here for you! Contact us to resolve any query.
      </p>
      

      {/* Contact Developer Section */}
      <div className="gothic-card rounded-lg p-6 border-2 border-primary/20 hover:border-primary/40 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-full border border-primary/30 flex-shrink-0">
            <Code2 size={28} className="text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-2xl font-cinzel text-primary mb-2">Contact Developer</h3>
            <p className="text-cream-dark font-lora mb-4">
              For technical issues, bugs, feature requests, or platform problems
              an author who wants a website of your own 
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={24} className="text-green-fresh" />
                <span className="font-lora text-cream">Rajvi Gupta</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail size={24} className="text-green-fresh" />
                <a 
                  href="mailto:rajvigupta04@gmail.com" 
                  className="font-lora text-primary hover:text-gold-bright transition-colors underline"
                >
                  rajvigupta04@gmail.com
                </a>
              </div>
            </div>

            
          </div>
        </div>
      </div>
      

      {/* Contact Author Section */}
      <div className="gothic-card rounded-lg p-6 border-2 border-gold/20 hover:border-gold/40 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gold/10 rounded-full border border-gold/30 flex-shrink-0">
            <BookOpen size={28} className="text-text-gold" />
          
          </div>
            <div className="flex-1">
            <h3 className="text-2xl font-cinzel text-primary mb-2">Contact Author </h3>
            <p className="text-cream-dark font-lora mb-4">
              For questions about stories, content, timelines, feedback, or creative inquiries
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={24} className="text-green-fresh" />
                <span className="font-lora text-cream">Alankrita (@memorycraver)</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail size={24} className="text-green-fresh" />
                <a 
                  href="mailto:author@memorycraver.com" 
                  className="font-lora text-text-gold underline"
                >
                 alankritamemorycraver@gmail.com
                </a>
              </div>
            </div>

    
          </div>
        </div>
      </div>


      

      {/* Quick Help Guide */}
      <div className="mt-8 pt-6 border-t border-gold/20">
        <h4 className="text-xl font-cinzel text-gold mb-4 text-center">Common Issues</h4>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-forest-mid rounded-lg border border-accent-maroon/20">
            <div className="flex items-start gap-3">
              <Bug size={20} className="text-accent-maroon-light flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-lora font-semibold text-cream mb-1">Can't access purchased chapter?</h5>
                <p className="text-sm text-cream-dark">
                  Contact the developer to resolve the bug and the author to verify if the payment has been received.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-forest-mid rounded-lg border border-accent-maroon/20">
            <div className="flex items-start gap-3">
              <MessageCircle size={20} className="text-accent-maroon-light flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-lora font-semibold text-cream mb-1">Forgot password?</h5>
                <p className="text-sm text-cream-dark">
                  Use "Forgot Password" on login page - you'll need your security answer
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-forest-mid rounded-lg border border-accent-maroon/20">
            <div className="flex items-start gap-3">
              <Mail size={20} className="text-accent-maroon-light flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-lora font-semibold text-cream mb-1">Payment not processing?</h5>
                <p className="text-sm text-cream-dark">
                  Contact developer with transaction details or screenshot
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-forest-mid rounded-lg border border-accent-maroon/20">
            <div className="flex items-start gap-3">
              <BookOpen size={20} className="text-accent-maroon-light flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-lora font-semibold text-cream mb-1">Content questions?</h5>
                <p className="text-sm text-cream-dark">
                  Contact the author for story and scedule related inquiries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-cream-dark italic font-lora">
          We typically respond within 24-48 hours. Please be as detailed as possible when describing 
          your issue.
        </p>
      </div>
    </div>
  );
}