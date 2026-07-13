import type {
    AnchorHTMLAttributes,
    HTMLAttributes,
    ReactNode,
} from 'react'

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
    children: ReactNode
}

type ParagraphProps = HTMLAttributes<HTMLParagraphElement> & {
    children: ReactNode
}

export function BlogH1({ children, className = '', ...props }: HeadingProps) {
    return (
        <h1
            className={`text-blog-h1 m-0 text-center text-white ${className}`.trim()}
            {...props}
        >
            {children}
        </h1>
    )
}

export function BlogH2({ children, className = '', ...props }: HeadingProps) {
    return (
        <h2
            className={`text-blog-h2 m-0 text-white ${className}`.trim()}
            {...props}
        >
            {children}
        </h2>
    )
}

export function BlogH3({ children, className = '', ...props }: HeadingProps) {
    return (
        <h3
            className={`text-blog-h3 m-0 text-white ${className}`.trim()}
            {...props}
        >
            {children}
        </h3>
    )
}

export function BlogH4({ children, className = '', ...props }: HeadingProps) {
    return (
        <h4
            className={`text-blog-h4 m-0 text-white ${className}`.trim()}
            {...props}
        >
            {children}
        </h4>
    )
}

export function BlogH5({ children, className = '', ...props }: HeadingProps) {
    return (
        <h5
            className={`text-blog-h5 m-0 text-white ${className}`.trim()}
            {...props}
        >
            {children}
        </h5>
    )
}

export function BlogH6({ children, className = '', ...props }: HeadingProps) {
    return (
        <h6
            className={`text-blog-h6 m-0 text-white ${className}`.trim()}
            {...props}
        >
            {children}
        </h6>
    )
}

export function BlogBody({ children, className = '', ...props }: ParagraphProps) {
    return (
        <p
            className={`text-blog-body m-0 text-[#989898] ${className}`.trim()}
            {...props}
        >
            {children}
        </p>
    )
}

export function BlogLink({
    children,
    className = '',
    ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
    return (
        <a
            className={`text-blog-body text-[#989898] underline decoration-from-font underline-offset-2 hover:text-white ${className}`.trim()}
            {...props}
        >
            {children}
        </a>
    )
}

export function BlogAccentLink({
    children,
    className = '',
    ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
    return (
        <a
            className={`text-blog-body text-[#009dff] underline decoration-from-font underline-offset-2 hover:text-[#4db8ff] ${className}`.trim()}
            {...props}
        >
            {children}
        </a>
    )
}

export function BlogBodySm({ children, className = '', ...props }: ParagraphProps) {
    return (
        <p
            className={`font-mori m-0 text-base leading-normal text-[#989898] ${className}`.trim()}
            {...props}
        >
            {children}
        </p>
    )
}

export function BlogDivider({
    className = '',
    visible = false,
}: {
    className?: string
    visible?: boolean
}) {
    return (
        <hr
            aria-hidden={!visible}
            className={`m-0 h-px w-full border-0 bg-white/10 ${visible ? '' : 'invisible'} ${className}`.trim()}
        />
    )
}
