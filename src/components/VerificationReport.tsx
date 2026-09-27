import React from 'react';
import Markdown from 'react-markdown';

interface VerificationReportProps {
  report: string;
}

export function VerificationReport({ report }: VerificationReportProps) {

  return (
    <div className="w-full h-full overflow-y-auto p-6 bg-[#1A1C20] text-gray-200">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Report Content */}
        <div className="bg-[#151619] border border-white/10 rounded-xl p-6 shadow-xl leading-relaxed text-sm text-gray-300">
          <div className="prose prose-invert max-w-none space-y-4">
            <Markdown
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold text-emerald-400 border-b border-white/10 pb-2 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold text-gray-100 mt-6 mb-3 flex items-center gap-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-emerald-300 mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-gray-300 leading-relaxed mb-3">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 text-gray-300 mb-4">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 text-gray-300 mb-4">{children}</ol>,
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className && typeof children === 'string' && !children.includes('\n');
                  if (isInline) {
                    return <code className="bg-[#23272e] text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
                  }
                  return (
                    <div className="my-3 rounded-lg overflow-hidden border border-white/10 bg-[#0d1117] p-3 text-xs font-mono text-gray-200">
                      <pre className="overflow-x-auto whitespace-pre">{children}</pre>
                    </div>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4 border border-white/10 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="bg-white/5 px-3 py-2 text-gray-300 font-semibold border-b border-white/10">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 border-b border-white/5 font-mono text-gray-300">{children}</td>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-emerald-500 pl-4 py-1 my-3 text-gray-400 italic bg-white/5 rounded-r">
                    {children}
                  </blockquote>
                )
              }}
            >
              {report}
            </Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}
