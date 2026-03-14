import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface MonetizationCondition {
  id: string;
  label: string;
  current: number;
  required: number;
  unit: string;
}

interface MonetizationProgressProps {
  conditions: MonetizationCondition[];
  isEligible: boolean;
  onEligibilityChange?: (eligible: boolean) => void;
}

export function MonetizationProgressBar({ conditions, isEligible, onEligibilityChange }: MonetizationProgressProps) {
  const [allConditionsMet, setAllConditionsMet] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    // Check if all conditions are met
    const allMet = conditions.every(condition => condition.current >= condition.required);
    
    if (allMet && !allConditionsMet) {
      setAllConditionsMet(true);
      setShowSuccessMessage(true);
      onEligibilityChange?.(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } else if (!allMet && allConditionsMet) {
      setAllConditionsMet(false);
      onEligibilityChange?.(false);
    }
  }, [conditions, allConditionsMet, onEligibilityChange]);

  // Calculate overall progress
  const totalProgress = conditions.reduce((sum, cond) => {
    const progress = Math.min((cond.current / cond.required) * 100, 100);
    return sum + progress;
  }, 0);
  const overallProgress = Math.round(totalProgress / conditions.length);

  return (
    <div className="space-y-6">
      {/* SUCCESS MESSAGE */}
      {showSuccessMessage && allConditionsMet && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-700">✅ Félicitations !</p>
              <p className="text-sm text-green-600">
                Vous avez rempli toutes les conditions de monétisation. 
                Vous pouvez maintenant être payé sur vos vidéos !
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OVERALL PROGRESS */}
      <div className="bg-black/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">Progression globale</h3>
          <span className="text-2xl font-bold text-white">{overallProgress}%</span>
        </div>
        
        {/* PROGRESS BAR */}
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              allConditionsMet 
                ? 'bg-gradient-to-r from-green-400 to-green-600' 
                : 'bg-gradient-to-r from-blue-400 to-purple-500'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* STATUS TEXT */}
        <p className="text-gray-400 text-sm mt-3">
          {allConditionsMet 
            ? '✅ Tous les critères sont remplis !' 
            : `⏳ ${100 - overallProgress}% restants pour être éligible`}
        </p>
      </div>

      {/* INDIVIDUAL CONDITIONS */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-lg">Conditions à remplir :</h3>
        
        {conditions.map((condition) => {
          const progress = Math.min((condition.current / condition.required) * 100, 100);
          const isMet = condition.current >= condition.required;

          return (
            <div key={condition.id} className="bg-black/50 rounded-lg p-4">
              {/* CONDITION HEADER */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isMet ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  )}
                  <span className="text-white font-semibold">{condition.label}</span>
                </div>
                <span className={`font-bold ${isMet ? 'text-green-400' : 'text-gray-300'}`}>
                  {condition.current.toLocaleString()} / {condition.required.toLocaleString()} {condition.unit}
                </span>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isMet 
                      ? 'bg-gradient-to-r from-green-400 to-green-600' 
                      : 'bg-gradient-to-r from-blue-400 to-purple-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* PROGRESS TEXT */}
              <p className="text-gray-400 text-xs mt-2">
                {isMet 
                  ? '✅ Condition remplie' 
                  : `⏳ ${Math.round(progress)}% complété`}
              </p>
            </div>
          );
        })}
      </div>

      {/* INFO BOX */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-bold">💡 Info :</span> Vous devez remplir <strong>TOUTES</strong> les conditions 
          pour être éligible à la monétisation. Une fois toutes les conditions remplies, 
          vous recevrez une notification et pourrez commencer à gagner de l'argent !
        </p>
      </div>
    </div>
  );
}
