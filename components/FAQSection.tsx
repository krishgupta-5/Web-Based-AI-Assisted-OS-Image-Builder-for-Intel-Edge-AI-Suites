"use client";
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
interface FAQItem {
    question: string;
    answer: string;
}
const faqData: FAQItem[] = [
    {
        question: "What is EdgeOS?",
        answer: "EdgeOS is a workflow automation platform where you build flows visually, connect integrations, and run AI + API automations from one place."
    },
    {
        question: "How many workflows can I create?",
        answer: "The Free plan allows up to 30 workflows and includes 1,000 workflow runs per month. Pro and Startup both include unlimited workflows, with higher run limits and team collaboration features on Startup."
    },
    {
        question: "What is a workflow run?",
        answer: "A workflow run is one full execution of a workflow. Each trigger event or manual run counts as one run."
    },
    {
        question: "Can I integrate with my existing tools?",
        answer: "Yes. EdgeOS supports integrations like HTTP APIs, webhooks, Notion, Slack, Discord, GitHub, and AI providers such as OpenAI, Anthropic, and Gemini."
    },
    {
        question: "Do I need coding experience to use EdgeOS?",
        answer: "No. You can build and configure workflows with the visual builder. Advanced users can still set up more complex logic with node configuration and structured payload mapping."
    },
    {
        question: "Can I upgrade or downgrade my plan?",
        answer: "Yes. You can change plans anytime. Upgrades apply immediately, and downgrades apply at the next billing cycle."
    }
];
export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };
    return (<section id="faq" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col gap-12 xl:flex-row xl:gap-16">
          
          <div className="flex shrink-0 flex-col xl:w-[368px]">
            <div className="text-sm font-medium text-[#7D7D87] mb-2">F.A.Q</div>
            <h2 className="font-serif italic text-3xl md:text-4xl font-semibold text-white mb-3">
              Frequently Asked Questions.
            </h2>
            <p className="text-base text-[#7D7D87]">
              Get <span className="font-medium text-[#E5E5E5]">answers</span> to{' '}
              <span className="font-medium text-[#E5E5E5]">commonly</span> asked questions.
            </p>
          </div>

          
          <div className="flex-1 space-y-4">
            {faqData.map((item, index) => (<div key={index}>
                <button onClick={() => toggleAccordion(index)} className="group flex w-full items-center justify-between gap-4 text-left py-4 transition-colors duration-150 ease-out hover:text-[#E5E5E5]" aria-expanded={openIndex === index}>
                  <span className="text-base font-medium text-white flex-1">
                    {item.question}
                  </span>
                  <ChevronDown className={`size-5 shrink-0 text-[#7D7D87] transition-transform duration-200 ease-out ${openIndex === index ? 'rotate-180' : ''}`}/>
                </button>
                
                <div className={`grid transition-all duration-200 ease-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="text-[#7D7D87] pb-4 pr-8">
                      {item.answer}
                    </p>
                  </div>
                </div>
                
                {index < faqData.length - 1 && (<div className="h-px w-full bg-[#333333]"/>)}
              </div>))}
          </div>
        </div>
      </div>

      
      <div className="hidden md:flex justify-center mt-16 md:mt-24">

      </div>
    </section>);
}