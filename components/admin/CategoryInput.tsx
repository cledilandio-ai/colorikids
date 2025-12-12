
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CategoryInputProps {
    value: string;
    onChange: (value: string) => void;
}

const CATEGORIES = [
    "Vestido",
    "Conjunto",
    "Blusa",
    "Calça",
    "Shorts",
    "Saia",
    "Macacão",
    "Jardineira",
    "Body",
    "Pijama",
    "Acessórios",
    "Calçados",
];

export function CategoryInput({ value, onChange }: CategoryInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Capitalize first letter
        const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
        onChange(capitalized);
        setIsOpen(true); // Open list when typing to show suggestions if we wanted filtering, but user just wants dropdown available. 
        // Actually, let's keep it simple: typing doesn't force open, but arrow does.
        // Wait, "if operator clicks arrow it shows dropdown". 
        // I'll leave isOpen management to the button primarily, but maybe close it on selection.
    };

    const handleSelect = (category: string) => {
        onChange(category);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    className="w-full rounded-md border border-gray-300 p-2 pr-10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Selecione ou digite..."
                    value={value}
                    onChange={handleInputChange}
                    onClick={() => {
                        // Optional: Open on click? User said "click arrow", but click input is also nice.
                        // Let's stick to arrow for now to be precise, or maybe both.
                    }}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-gray-500 hover:text-primary"
                    tabIndex={-1} // Skip tab index so tab goes to next input
                >
                    <ChevronDown className="h-4 w-4" />
                </button>
            </div>

            {isOpen && (
                <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    {CATEGORIES.map((category) => (
                        <li
                            key={category}
                            className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 ${value === category ? "bg-gray-50 font-medium text-primary" : "text-gray-700"}`}
                            onClick={() => handleSelect(category)}
                        >
                            {category}
                        </li>
                    ))}
                    {CATEGORIES.length === 0 && (
                        <li className="px-3 py-2 text-sm text-gray-400">Nenhuma categoria</li>
                    )}
                </ul>
            )}
        </div>
    );
}
