import { motion } from "motion/react";

export default function Spinner() {
  return (
    <motion.div
      className="w-3 h-3 rounded-full bg-black"
      animate={{
        scale: [1, 1.3, 1],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
