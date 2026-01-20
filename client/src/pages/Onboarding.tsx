import { useLocation } from "wouter";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { Step1RestaurantInfo } from "@/components/onboarding/Step1RestaurantInfo";
import { Step2BusinessHours } from "@/components/onboarding/Step2BusinessHours";
import { Step3AgentSelection } from "@/components/onboarding/Step3AgentSelection";
import { Step4PaymentSetup } from "@/components/onboarding/Step4PaymentSetup";
import { Step5Confirmation } from "@/components/onboarding/Step5Confirmation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ONBOARDING_STEPS = [
  {
    id: "restaurant-info",
    title: "Restaurant Info",
    description: "Tell us about your restaurant",
    component: Step1RestaurantInfo,
  },
  {
    id: "business-hours",
    title: "Business Hours",
    description: "Set your operating hours",
    component: Step2BusinessHours,
  },
  {
    id: "agent-selection",
    title: "Select Agents",
    description: "Choose your AI workforce",
    component: Step3AgentSelection,
  },
  {
    id: "payment",
    title: "Payment",
    description: "Review and confirm",
    component: Step4PaymentSetup,
  },
  {
    id: "confirmation",
    title: "Done",
    description: "You're all set!",
    component: Step5Confirmation,
  },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const createRestaurant = trpc.restaurants.create.useMutation();

  const handleComplete = async (data: Record<string, unknown>) => {
    try {
      // Create the restaurant with onboarding data
      await createRestaurant.mutateAsync({
        name: (data.name as string) || "My Restaurant",
        email: data.email as string | undefined,
        phone: data.phone as string | undefined,
        address: data.address as string | undefined,
        timezone: "UTC",
      });

      toast.success("Restaurant created successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to create restaurant:", error);
      toast.error("Failed to complete onboarding. Please try again.");
    }
  };

  return (
    <OnboardingWizard steps={ONBOARDING_STEPS} onComplete={handleComplete} />
  );
}
