import React, { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What is Grumpy Gamer?",
    answer: "Grumpy Gamer is a platform for gamers to track their gaming experiences, connect with other players, and discover new games. Whether you're a casual player or a hardcore gamer, we've got something for you!"
  },
  {
    question: "Is Grumpy Gamer free to use?",
    answer: "Yes! Grumpy Gamer is completely free to use. We believe gaming should be accessible to everyone. Some premium features may be added in the future, but the core experience will always be free."
  },
  {
    question: "How do I create an account?",
    answer: "Creating an account is easy! Just click the 'Sign Up' button in the navigation bar, enter your email and password, and you're all set. You can start tracking your games immediately."
  },
  {
    question: "Can I track games from multiple platforms?",
    answer: "Absolutely! Grumpy Gamer supports games from PC, PlayStation, Xbox, Nintendo Switch, and mobile platforms. You can track all your gaming adventures in one place."
  },
  {
    question: "How do I reset my password?",
    answer: "If you've forgotten your password, click 'Log In' and then 'Forgot Password'. We'll send you an email with instructions to reset your password securely."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we take security seriously. Your password is encrypted using industry-standard bcrypt hashing, and we use JWT tokens for secure authentication. We never share your personal data with third parties."
  },
  {
    question: "Can I delete my account?",
    answer: "Yes, you can delete your account at any time from your profile settings. Please note that this action is irreversible and all your data will be permanently removed."
  },
  {
    question: "How can I contact support?",
    answer: "You can reach us through our Contact page, email us at support@grumpygamer.com, or join our Discord community. We typically respond within 24-48 hours."
  },
  {
    question: "Why 'Grumpy' Gamer?",
    answer: "Because let's be honest - we've all had those gaming moments that make us a little grumpy! Whether it's a tough boss fight, lag in multiplayer, or just not finding time to play, we get it. Embrace the grump! 😤🎮"
  }
];

const FAQItem: React.FC<{ item: FAQItem; isOpen: boolean; onClick: () => void }> = ({ 
  item, 
  isOpen, 
  onClick 
}) => {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 8,
      marginBottom: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      overflow: "hidden"
    }}>
      <button
        onClick={onClick}
        style={{
          width: "100%",
          padding: "18px 20px",
          background: isOpen ? "#f0f7ff" : "#fff",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 16,
          fontWeight: 600,
          color: "#1a1a2e",
          transition: "background 0.2s"
        }}
      >
        <span>{item.question}</span>
        <span style={{
          fontSize: 20,
          color: "#2d72d9",
          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.2s"
        }}>
          +
        </span>
      </button>
      {isOpen && (
        <div style={{
          padding: "0 20px 18px 20px",
          color: "#555",
          lineHeight: 1.7,
          fontSize: 15,
          background: "#f0f7ff"
        }}>
          {item.answer}
        </div>
      )}
    </div>
  );
};

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div style={{
      maxWidth: 700,
      margin: "40px auto",
      padding: "0 20px"
    }}>
      <h1 style={{ 
        fontSize: 32, 
        fontWeight: 700, 
        marginBottom: 16,
        color: "#1a1a2e",
        textAlign: "center"
      }}>
        Frequently Asked Questions
      </h1>
      <p style={{ 
        color: "#666", 
        marginBottom: 40,
        fontSize: 16,
        lineHeight: 1.6,
        textAlign: "center"
      }}>
        Got questions? We've got answers! If you can't find what you're looking for, 
        feel free to <a href="/contact" style={{ color: "#2d72d9" }}>contact us</a>.
      </p>

      <div>
        {faqData.map((item, index) => (
          <FAQItem
            key={index}
            item={item}
            isOpen={openIndex === index}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>

      <div style={{
        marginTop: 48,
        padding: 32,
        background: "linear-gradient(135deg, #2d72d9 0%, #1a4f9c 100%)",
        borderRadius: 12,
        textAlign: "center",
        color: "#fff"
      }}>
        <h3 style={{ marginBottom: 12, fontSize: 20 }}>Still have questions?</h3>
        <p style={{ marginBottom: 20, opacity: 0.9 }}>
          We're here to help! Reach out and we'll get back to you ASAP.
        </p>
        <a
          href="/contact"
          style={{
            display: "inline-block",
            padding: "12px 32px",
            background: "#fff",
            color: "#2d72d9",
            borderRadius: 6,
            fontWeight: 600,
            textDecoration: "none"
          }}
        >
          Contact Us
        </a>
      </div>
    </div>
  );
};

export default FAQPage;
