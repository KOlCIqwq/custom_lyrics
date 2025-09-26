import { translateAPiSite} from '../secrets/secrets'
import { getActiveLyricRequestUri, preferredLanguage, setPreferredLanguage, setTranslatedLyrics, translationEnabled } from '../state/lyricsState';
import { insertTranslations } from './lyricsFetcher';
declare global {
  interface Window {
    Spicetify: any;
  }
}

/*
    1. Translate the pharase requesting api
    2. Divide the lyrics into batches of 1000 words
        2.1 We should divide before truncating, avoiding non-meaningful translation (exam/ple)
        2.2 Better again if we limit to phrase (this is a pharase [993], this is second phrase).
            This way the translator could have more sense of entire phrase
    3. We don't pass the timestamp, since it will be useless and waste of words
        3.1 For each [End of Line] we represent it with '@@'
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

type TranslatedLyrics = {
  time: number;
  line: string;
};

/* function stringLanguageToAbb(language:string){
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
} */

async function translate(query:string){
    const baseUrl = translateAPiSite;
    try{
        if (preferredLanguage == 'zh'){
            setPreferredLanguage('zh-Hans');
        }
        let queryParams = 'q=' + query + '&to=' + preferredLanguage;
        const url = `${baseUrl}?${queryParams.toString()}`;
        //Spicetify.showNotification(url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        const data:Translation = await response.json();
        //Spicetify.showNotification(data.translation);
        return data;
    }catch(error){
        const errorMessage = (error instanceof Error)
            ? error.message 
            : String(error);
        Spicetify.showNotification(`Translation failed: ${errorMessage}`, true);
    }
} 

function stickTranslationLyrics(lyrics: { time: number; line: string }[], outputQuery:string){
    // This should be the same size of lyrics
    const parts = outputQuery.split("@@");
    let translatedLyrics:TranslatedLyrics[] = [];
    for (let i = 0; i < lyrics.length; i++){
        if (parts[i]) {
            translatedLyrics.push({time:lyrics[i].time,line:parts[i]})
        }
    }
    return translatedLyrics;
}

export async function processFullLyrics(lyrics: { time: number; line: string }[],requestUri: string){
    if (requestUri !== getActiveLyricRequestUri()) {
        return;
    }
    //Spicetify.showNotification("translating")
    let length_count = 0;
    let outputQuery = "";
    let batchQuery = "";
    for (let i = 0; i < lyrics.length; i++){
        if (lyrics[i].line.length + length_count < 800){
            // If we still can fit this lyrics line
            batchQuery += lyrics[i].line + "@@";
            length_count += lyrics[i].line.length + 2;
        }else{
            const data = await translate(batchQuery);
            if (requestUri !== getActiveLyricRequestUri()) {
                //Spicetify.showNotification('Stale translation request (mid-batch). Aborting.');
                return;
            }
            if (data == null){
                Spicetify.showNotification("null data");
            } else {
                outputQuery += data.translation;
            }
            // Reset the batch
            batchQuery = "";
            length_count = 0
            batchQuery = lyrics[i].line + "@@";
            length_count += 2;
        }
    }
    if (batchQuery != null){
        const data = await translate(batchQuery);
        if (requestUri !== getActiveLyricRequestUri()) {
            //Spicetify.showNotification('Stale translation request (final-batch). Aborting.');
            return;
        }
        if (data == null){
            Spicetify.showNotification("null data");
        } else {
            outputQuery += data.translation;
        }
    }
    const translatedLyrics = stickTranslationLyrics(lyrics,outputQuery);
    if (translatedLyrics == null){
        return;
    }
    if (requestUri !== getActiveLyricRequestUri()) {
        //Spicetify.showNotification('Stale translation request (pre-update). Aborting.');
        return;
    }
    setTranslatedLyrics(translatedLyrics);
    if (translationEnabled) {
        insertTranslations(translatedLyrics);
    }
}
