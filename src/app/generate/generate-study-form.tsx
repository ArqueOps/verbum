"use client";

import { useCallback } from "react";
import { PassagePicker, type PassageSelection } from "@/components/study/PassagePicker";

export function GenerateStudyForm() {
  const handlePassageSelect = useCallback((selection: PassageSelection) => {
    console.log("Selected passage:", selection);
  }, []);

  return (
    <PassagePicker
      onPassageSelect={handlePassageSelect}
      className="w-full"
    />
  );
}
