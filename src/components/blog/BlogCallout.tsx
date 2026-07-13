import type { ReactNode } from 'react'
import { Info, Lightbulb } from 'lucide-react'

export function BlogInfoCallout({ children }: { children: ReactNode }) {
    return (
        <div className="flex w-full gap-3 rounded-2xl bg-[#1b1b1b] px-3 py-2.5">
            <div className="pt-1">
                <Lightbulb
                    className="size-4 text-[#a1a1a1]"
                    strokeWidth={1.5}
                    aria-hidden
                />
            </div>
            <div className="min-w-0 flex-1 text-base leading-normal text-[#a1a1a1]">
                {children}
            </div>
        </div>
    )
}

export function BlogTipCallout({ children }: { children: ReactNode }) {
    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-[#252837] bg-[#000120] py-2.5 pl-[58px] pr-3">
            <div
                className="absolute left-2.5 top-[11px] flex h-[41px] w-[37px] flex-col gap-0.5 rounded-md border border-[#252837] bg-[#335cff] p-1"
                aria-hidden
            >
                <div className="flex gap-0.5 pb-0.5">
                    <span className="size-[3px] rounded-full bg-[#7aa2ff]" />
                    <span className="size-[3px] rounded-full bg-[#5c8aff]" />
                    <span className="size-[3px] rounded-full bg-[#4a78f5]" />
                </div>
                <div className="flex items-center gap-0.5">
                    <Info className="size-1.5 shrink-0 text-white" strokeWidth={2.5} />
                    <span className="h-[2px] flex-1 rounded-full bg-white" />
                </div>
                <div className="flex items-center gap-0.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-[#2748c7]" />
                    <span className="h-[2px] flex-1 rounded-full bg-[#2748c7]" />
                </div>
                <div className="flex items-center gap-0.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-[#2748c7]" />
                    <span className="h-[2px] flex-1 rounded-full bg-[#2748c7]" />
                </div>
            </div>
            <div className="text-base leading-normal text-white">{children}</div>
        </div>
    )
}
