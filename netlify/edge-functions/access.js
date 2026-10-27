import {access} from '../../server/access.mjs';
export default (request,context)=>access(request,()=>context.next());
