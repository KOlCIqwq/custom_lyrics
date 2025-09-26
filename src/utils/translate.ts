import { translateAPiSite} from '../secrets/secrets'
import { preferredLanguage } from '../state/lyricsState';
declare global {
  interface Window {
    Spicetify: any;
  }
}

/*
    1. Translate the pharase requesting api
    2. divide the lyrics into batches of 1000 words
        2.1 We should divide before truncating, avoiding non-meaningful translation (exam/ple)
        2.2 Better again if we limit to phrase (this is a pharase [993], this is second phrase).
            This way the translator could have more sense of entire phrase
    3. We don't pass the timestamp, since it will be useless and waste of words
        3.1 For each [End of Line] we represent it with '@#'
            Then process all of them assigning them to each lyrics line
*/

type Language = {
    from: string,
    to : string
}

type Translation = {
    text:string,
    userLang:string,
    translation:string,
    language: Language
}

function stringLanguageToAbb(language:string){
    switch (language){
        case 'English':
            return 'en';
        case 'Spanish':
            return 'es';
        case 'French':
            return 'fr';
        case 'German':
            return 'de'
        case 'Japanese':
            return 'jp';
        case 'Korean':
            return 'ko'
        case 'Chinese':
            return 'zh-Hans'
        default:
            return 'en'
    }
}

async function translate(query:string){
    const baseUrl = translateAPiSite;
    try{
        let lang = stringLanguageToAbb(preferredLanguage)
        let queryParams = 'q=' + query + '&to=' + lang;
        const url = `${baseUrl}?${queryParams.toString()}`;

        const response = await fetch(url);
        const data:Translation = await response.json();
        return data;
    }catch(e){
        Spicetify.showNotification("Could not translate");
    }
} 

export async function processFullLyrics(){}

