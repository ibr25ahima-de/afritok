import { Languages, Moon, Wifi, PlayCircle, Type, Sparkles, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSettingsText } from "@/i18n/settingsTranslations";

interface Props { settings: { language: string; darkMode: string; dataSaver: boolean; autoPlay: string; textSize: string; animations: boolean }; updateSetting: (key: string, value: any) => void; }
const LANGUAGES = ["Français", "English", "Kiswahili", "Yorùbá", "Hausa", "isiZulu"];
const LANGUAGE_CODES: Record<string, "fr"|"en"|"sw"|"yo"|"ha"|"zu"> = {"Français":"fr",English:"en",Kiswahili:"sw","Yorùbá":"yo",Hausa:"ha",isiZulu:"zu"};

export default function DisplaySettings({ settings, updateSetting }: Props) {
  const { language } = useLanguage();
  const t = (key: string, fallback: string) => getSettingsText(language, key, fallback);
  const languageNames: Record<string,string> = {Français:"Français",English:"English",Kiswahili:"Kiswahili","Yorùbá":"Yorùbá",Hausa:"Hausa",isiZulu:"isiZulu"};
  const localized = (value: string) => {
    const map: Record<string,string> = {"Système":t("system","Système"),"Sombre":t("dark","Sombre"),"Clair":t("light","Clair"),"Wi-Fi uniquement":t("wifiOnly","Wi-Fi uniquement"),"Toujours":t("always","Toujours"),"Jamais":t("never","Jamais"),"Normale":t("normal","Normale"),"Grande":t("large","Grande"),"Petite":t("small","Petite")};
    return map[value] ?? value;
  };
  const items = [
    { key:"language", icon:<Languages size={18}/>, label:t("language","Langue"), value:languageNames[settings.language] ?? settings.language },
    { key:"darkMode", icon:<Moon size={18}/>, label:t("darkMode","Mode sombre"), value:localized(settings.darkMode) },
    { key:"dataSaver", icon:<Wifi size={18}/>, label:t("dataSaver","Économie de données"), value:settings.dataSaver?t("enabled","Activé"):t("disabled","Désactivé") },
    { key:"autoPlay", icon:<PlayCircle size={18}/>, label:t("autoplay","Lecture automatique"), value:localized(settings.autoPlay) },
    { key:"textSize", icon:<Type size={18}/>, label:t("textSize","Taille du texte"), value:localized(settings.textSize) },
    { key:"animations", icon:<Sparkles size={18}/>, label:t("animations","Animations"), value:settings.animations?t("animationsOn","Activées"):t("animationsOff","Désactivées") },
  ];
  const handleClick = (key:string) => {
    if(key==="darkMode") updateSetting("darkMode",settings.darkMode==="Système"?"Sombre":settings.darkMode==="Sombre"?"Clair":"Système");
    else if(key==="dataSaver") updateSetting("dataSaver",!settings.dataSaver);
    else if(key==="animations") updateSetting("animations",!settings.animations);
    else if(key==="language"){const i=Math.max(0,LANGUAGES.indexOf(settings.language));updateSetting("language",LANGUAGES[(i+1)%LANGUAGES.length]);}
    else if(key==="autoPlay") updateSetting("autoPlay",settings.autoPlay==="Wi-Fi uniquement"?"Toujours":settings.autoPlay==="Toujours"?"Jamais":"Wi-Fi uniquement");
    else if(key==="textSize") updateSetting("textSize",settings.textSize==="Normale"?"Grande":settings.textSize==="Grande"?"Petite":"Normale");
  };
  return <Card className="bg-gray-900 border-gray-800 p-6"><h2 className="text-xl font-bold mb-4">{t("contentDisplay","Contenu et affichage")}</h2><div className="space-y-1">{items.map((item,index)=><button key={item.key} onClick={()=>handleClick(item.key)} className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition ${index!==items.length-1?"border-b border-gray-800":""}`}><div className="flex items-center gap-3"><span className="text-gray-400">{item.icon}</span><span>{item.label}</span></div><div className="flex items-center gap-2 text-gray-500"><span className="text-sm">{item.value}</span><ChevronRight size={16}/></div></button>)}</div></Card>;
}
