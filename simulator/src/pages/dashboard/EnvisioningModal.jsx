import React from 'react';
import { X, ChevronRight, ArrowLeft, Lightbulb } from 'lucide-react';

export default function EnvisioningModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-[#0A0A0C] w-full max-w-4xl rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Progress Header */}
        <div className="p-6 border-b border-gray-800">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold">P</div>
                    <span className="text-sm font-semibold tracking-tight">PentraAI <span className="text-gray-600 mx-1">/</span> Envisioning</span>
                </div>
                <div className="text-right">
                    <span className="block text-[9px] uppercase tracking-widest text-gray-500">Step 1 of 5</span>
                    <span className="text-xs font-medium text-gray-300">Define the Core Problem</span>
                </div>
            </div>
            <div className="flex gap-2">
                <div className="h-1 flex-1 bg-blue-600 rounded-full" />
                <div className="h-1 flex-1 bg-gray-800 rounded-full" />
                <div className="h-1 flex-1 bg-gray-800 rounded-full" />
            </div>
        </div>

        <div className="flex flex-1 overflow-y-auto">
            {/* Left Form Side */}
            <div className="flex-[1.4] p-8 border-r border-gray-800">
                <h2 className="text-2xl font-bold text-white mb-1">01. What are you building?</h2>
                <p className="text-gray-500 text-sm mb-8">Precision in problem definition directly correlates to simulation accuracy.</p>

                <div className="space-y-6">
                    <FormInput label="Startup Name" placeholder="e.g. Lumina Analytics" />
                    <FormInput label="Elevator Pitch" placeholder="Describe your solution in one sentence..." />

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Problem Statement</label>
                        <textarea className="w-full bg-[#111114] border border-gray-800 rounded-lg p-4 text-sm focus:border-blue-500 outline-none h-28 transition-all" placeholder="What specific pain point are you addressing? Be as detailed as possible." />
                    </div>

                    <FormInput label="Target Audience" placeholder="e.g. Fortune 500 CTOs" />

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Problem Urgency</label>
                        <div className="grid grid-cols-4 gap-1 bg-black p-1 rounded-xl border border-gray-800">
                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((lvl) => (
                                <button key={lvl} className={`py-2.5 text-[10px] font-bold rounded-lg transition-all ${lvl === 'HIGH' ? 'bg-[#1C1C21] text-blue-400 border border-blue-900/30' : 'text-gray-600 hover:text-gray-400'}`}>
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="flex-1 bg-[#0D0D0F] p-8">
                <div className="flex gap-3 mb-6">
                    <Lightbulb size={18} className="text-gray-400 shrink-0" />
                    <div>
                        <h4 className="text-[11px] font-bold text-gray-200 uppercase mb-2">Pro-Tip: Precision</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Clarity in your problem statement allows our AI to map the <span className="text-white">Competitive Landscape</span> with 94% higher accuracy.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 mb-12">
                    <CheckItem text="Avoid broad generalizations like 'improving efficiency'." />
                    <CheckItem text="Quantify the pain point if possible (e.g. 'losing 20 hours/week')." />
                </div>

                <div className="p-4 bg-[#141417] border border-gray-800 rounded-xl">
                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-2">AI Simulation Status</label>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-xs italic text-gray-500">Waiting for input...</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-between items-center">
            <button onClick={onClose} className="text-xs text-gray-500 flex items-center gap-2 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <div className="flex gap-3">
                <button className="px-6 py-2.5 text-xs font-semibold border border-gray-800 rounded-full hover:bg-gray-800 transition-colors">Save Draft</button>
                <button className="px-6 py-2.5 text-xs font-semibold bg-blue-600 text-white rounded-full flex items-center gap-2 hover:bg-blue-500 transition-all">
                    Next: Market Analysis <ChevronRight size={14} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

const FormInput = ({ label, placeholder }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</label>
        <input className="w-full bg-[#111114] border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-all" placeholder={placeholder} />
    </div>
);

const CheckItem = ({ text }) => (
    <div className="flex gap-3 items-start text-xs text-gray-500">
        <div className="w-4 h-4 rounded-full border border-blue-500/50 flex items-center justify-center text-blue-500 shrink-0">✓</div>
        <span>{text}</span>
    </div>
);