"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

const defaultV = { opacity: 0, y: 28 };
const showV = { opacity: 1, y: 0 };

export function Reveal({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={defaultV}
      whileInView={showV}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
