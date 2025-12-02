import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const passedRequirements = requirements.filter((req) => req.test(password)).length;
  const strength = password.length === 0 ? 0 : passedRequirements;

  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength <= 2) return "Weak";
    if (strength <= 3) return "Fair";
    if (strength <= 4) return "Good";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (strength <= 2) return "bg-destructive";
    if (strength <= 3) return "bg-warning";
    if (strength <= 4) return "bg-primary";
    return "bg-secondary";
  };

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            "font-medium",
            strength <= 2 && "text-destructive",
            strength === 3 && "text-warning",
            strength === 4 && "text-primary",
            strength === 5 && "text-secondary"
          )}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                level <= strength ? getStrengthColor() : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
      
      <ul className="space-y-1.5">
        {requirements.map((req, index) => {
          const passed = req.test(password);
          return (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                passed ? "text-secondary" : "text-muted-foreground"
              )}
            >
              {passed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
