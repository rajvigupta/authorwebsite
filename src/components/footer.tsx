import { useState } from 'react';
import { Github, Linkedin, Code2, Heart } from 'lucide-react';
import { PolicyModal } from './policymodal';
import { TermsOfServiceContent } from './termsofservice';
import { PrivacyPolicyContent } from './privacypolicy';
import { ContactSupportContent } from './contactsupport';

type ModalType = 'terms' | 'privacy' | 'contact' | null;

export function Footer() {
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const openTerms = () => setOpenModal('terms');
  const openPrivacy = () => setOpenModal('privacy');
  const openContact = () => setOpenModal('contact');
  const closeModal = () => setOpenModal(null);

  return (
    <>
      <footer className="relative bg-gothic-dark border-t-2 border-accent-maroon/30 mt-auto">
        {/* Ornamental top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left side - Platform info */}
            <div className="text-center md:text-left">
              <p className="text-sm text-text-muted font-lora">
                © {new Date().getFullYear()} ALANKRITA. All rights reserved.
              </p>
              <p className="text-xs font-cormorant italic text-text-dim mt-1">
                Immerse yourself in captivating narratives
              </p>
            </div>

            {/* Right side - Developer credits */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-text-muted font-lora">
                <Code2 size={20} className="text-primary" />
                <span>Developed with</span>
                <Heart size={25} className="text-accent-maroon fill-accent-maroon animate-pulse" />
                <span>by</span>
                <span className="font-cinzel font-semibold text-primary">
                  Rajvi
                </span>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-2 pl-3 border-l border-accent-maroon/30">
                <a
                  href="https://github.com/rajvigupta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all border border-transparent hover:border-primary/30"
                  aria-label="GitHub Profile"
                >
                  <Github size={18} />
                </a>
                <a
                  href="https://www.linkedin.com/in/rajvi-gupta-555464315/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all border border-transparent hover:border-primary/30"
                  aria-label="LinkedIn Profile"
                >
                  <Linkedin size={18} />
                </a>
              </div>
            </div>
          </div>

          {/* Author signature */}
          <div className="text-center mb-2 mt-6">
            <p className="signature-text">Alankrita</p>
          </div>

          {/* Ornamental divider */}
          <div className="ornamental-divider my-6"></div>

          {/* Additional links - NOW CLICKABLE */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted font-lora">
            <button
              onClick={openTerms}
              className="hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Terms of Service
            </button>
            <span className="text-accent-maroon/30">•</span>
            <button
              onClick={openPrivacy}
              className="hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Privacy Policy
            </button>
            <span className="text-accent-maroon/30">•</span>
            <button
              onClick={openContact}
              className="hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Contact Support
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PolicyModal
        isOpen={openModal === 'terms'}
        onClose={closeModal}
        title="Terms of Service"
      >
        <TermsOfServiceContent />
      </PolicyModal>

      <PolicyModal
        isOpen={openModal === 'privacy'}
        onClose={closeModal}
        title="Privacy Policy"
      >
        <PrivacyPolicyContent />
      </PolicyModal>

      <PolicyModal
        isOpen={openModal === 'contact'}
        onClose={closeModal}
        title="Contact Support"
      >
        <ContactSupportContent />
      </PolicyModal>
    </>
  );
}