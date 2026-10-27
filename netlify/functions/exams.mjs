import { getStore } from '@netlify/blobs';
import seed from '../../dist/questions.json' with {type:'json'};
import {createHandler} from '../../server/exams.mjs';
import {isAuthorized,lockedAPI} from '../../server/access.mjs';
export default async request=>await isAuthorized(request)?createHandler(getStore({name:'examstudio-library-v2',consistency:'strong'}),seed)(request):lockedAPI();
