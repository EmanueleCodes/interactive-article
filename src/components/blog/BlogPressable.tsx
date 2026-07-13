import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import {
    blogPressWhileTap,
    BLOG_PRESS,
    resolveBlogPress,
    type BlogPressConfig,
} from '@/components/blog/blogPressConfig'

type BlogPressableProps = HTMLMotionProps<'button'> & {
    press?: BlogPressConfig
}

/** Blog UI button — pointer cursor + unified press scale/easing. */
export function BlogPressable({
    className = '',
    disabled,
    children,
    whileTap,
    transition,
    press: pressOverrides,
    ...rest
}: BlogPressableProps) {
    const prefersReducedMotion = useReducedMotion()
    const press = resolveBlogPress(pressOverrides)

    return (
        <motion.button
            type="button"
            whileTap={
                whileTap ??
                (disabled || prefersReducedMotion
                    ? undefined
                    : blogPressWhileTap(press))
            }
            transition={transition}
            className={`cursor-pointer ${className}`.trim()}
            disabled={disabled}
            {...rest}
        >
            {children}
        </motion.button>
    )
}

export {
    BLOG_PRESS,
    blogPressWhileTap,
    resolveBlogPress,
    type BlogPressConfig,
} from '@/components/blog/blogPressConfig'
