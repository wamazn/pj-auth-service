. ./env-config.sh && hydra clients create \
    --endpoint $HYDRA_ADMIN_URL \
    --id $PJ_OAUTH_CLIENT_ID \
    --secret $PJ_OAUTH_CLIENT_SECRET \
    --response-types code,id_token \
    --grant-types refresh_token,authorization_code \
    --scope openid,offline \
    --callbacks $PJ_OAUTH_CLIENT_CALLBACK_URL