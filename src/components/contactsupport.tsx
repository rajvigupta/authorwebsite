import { Mail, User, Code2, BookOpen, MessageCircle, Bug } from 'lucide-react';

export function ContactSupportContent() {
  return (
    <div className="space-y-6 md:space-y-8">
      <p className="text-center text-cream-dark italic leading-relaxed text-sm md:text-base px-2">
        Need help? Have questions? We're here for you! Contact us to resolve any query.
      </p>
      

      {/* Contact Developer Section */}
      <div className="gothic-card rounded-lg p-4 md:p-6 border-2 border-primary/20 hover:border-primary/40 transition-all">
        <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
          <div className="p-2 md:p-3 bg-primary/10 rounded-full border border-primary/30 flex-shrink-0">
            <Code2 size={24} className="md:w-7 md:h-7 text-primary" />
          </div>
          
          <div className="flex-1 w-full">
            <h3 className="text-xl md:text-2xl font-cinzel text-primary mb-2">Contact Developer</h3>
            <p className="text-cream-dark font-lora mb-3 md:mb-4 text-sm md:text-base break-words">
              For technical issues, bugs, feature requests, or if you want a platform of your own!
            </p>
            
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 md:gap-3">
                <User size={20} className="md:w-6 md:h-6 text-gray-600 flex-shrink-0" />
                <span className="font-lora text-cream text-sm md:text-base">Rajvi Gupta</span>
              </div>
              
              <div className="flex items-start gap-2 md:gap-3">
                <Mail size={20} className="md:w-6 md:h-6 text-gray-600 flex-shrink-0 mt-0.5" />
                <a 
                  href="mailto:rajvigupta04@gmail.com" 
                  className="font-lora text-primary hover:text-gold-bright transition-colors underline text-sm md:text-base break-all"
                >
                  rajvigupta04@gmail.com
                </a>
              </div>
            </div>

            
          </div>
        </div>
      </div>
      

      {/* Contact Author Section */}
      <div className="gothic-card rounded-lg p-4 md:p-6 border-2 border-gold/20 hover:border-gold/40 transition-all">
        <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
          <div className="p-2 md:p-3 bg-gold/10 rounded-full border border-gold/30 flex-shrink-0">
            <BookOpen size={24} className="md:w-7 md:h-7 text-text-gold" />
          
          </div>
            <div className="flex-1 w-full">
            <h3 className="text-xl md:text-2xl font-cinzel text-primary mb-2">Contact Author </h3>
            <p className="text-cream-dark font-lora mb-3 md:mb-4 text-sm md:text-base break-words">
              For questions about stories, content, timelines, feedback, or creative inquiries
            </p>
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 md:gap-3">
                <User size={20} className="md:w-6 md:h-6 text-gray-600 flex-shrink-0" />
                <span className="font-lora text-cream text-sm md:text-base">Alankrita</span>
              </div>
              
              <div className="flex items-start gap-2 md:gap-3">
                <Mail size={20} className="md:w-6 md:h-6 text-gray-600 flex-shrink-0 mt-0.5" />
                <a 
                  href="mailto:author@memorycraver.com" 
                  className="font-lora text-text-gold underline text-sm md:text-base break-all"
                >
                 alankritamemorycraver@gmail.com
                </a>
              </div>
            </div>

    
          </div>
        </div>
      </div>


      

      {/* Quick Help Guide */}
      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gold/20">
        <h4 className="text-lg md:text-xl font-cinzel text-gold mb-3 md:mb-4 text-center">Common Issues</h4>
        
        <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
          <div className="p-3 md:p-4 bg-forest-mid rounded-lg border border-accent-maroon/20">
            <div className="flex items-start gap-2 md:gap-3">
              <Bug size={18} className="md:w-5 md:h-5 text-accent-maroon-light flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-lora font-semibold text-cream mb-1 text-sm md:text-base">Can't access purchased chapter?</h5>
                <p className="text-xs md:text-sm text-cream-dark break-words">
                  Contact the developer to resolve the bug and the author to verify if the payment has been received.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-forest-mid rounded-lg border border-accent-maroon/20">
            <div className="flex items-start gap-2 md:gap-3">
              <MessageCircle size={18} className="md:w-5 md:h-5 text-accent-maroon-light flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-lora font-semibold text-cream mb-1 text-sm md:text-base">Forgot password?</h5>
                <p className="text-xs md:text-sm text-cream-dark break-words">
                  Use "Forgot Password" on login page - you'll need your security answer
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-forest-mid rounded-lg border border-accent-maroon/20">
            <div className="flex items-start gap-2 md:gap-3">
              <Mail size={18} className="md:w-5 md:h-5 text-accent-maroon-light flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-lora font-semibold text-cream mb-1 text-sm md:text-base">Payment not processing?</h5>
                <p className="text-xs md:text-sm text-cream-dark break-words">
                  Contact developer with transaction details or screenshot
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-forest-mid rounded-lg border border-accent-maroon/20">
            <div className="flex items-start gap-2 md:gap-3">
              <BookOpen size={18} className="md:w-5 md:h-5 text-accent-maroon-light flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-lora font-semibold text-cream mb-1 text-sm md:text-base">Content questions?</h5>
                <p className="text-xs md:text-sm text-cream-dark break-words">
                  Contact the author for story and schedule related inquiries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 md:mt-8 text-center px-2">
        <p className="text-xs md:text-sm text-cream-dark italic font-lora break-words">
          We typically respond within 24-48 hours. Please be as detailed as possible when describing 
          your issue.
        </p>
      </div>
    </div>
  );
}