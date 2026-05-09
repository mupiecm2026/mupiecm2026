module.exports=[96112,a=>{"use strict";a.s(["createIdempotencyContext",0,function(a){let b=`idemp_${crypto.randomUUID()}`,c=`req_${crypto.randomUUID()}`;return{headers:{"X-Idempotency-Key":b,"X-Request-ID":c},idempotencyKey:b,requestId:c}}])}];

//# sourceMappingURL=lib_utils_idempotency_ts_11foh82._.js.map