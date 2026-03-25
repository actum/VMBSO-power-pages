pac pages download-code-site --path ./ --webSiteId ac923a79-af52-4a68-8d8f-9f947a0d5821 --overwrite
Copy-Item -Path ./vmbso-customer-portal-v2/.powerpages-site/* -Destination ./.powerpages-site/ -Recurse -Force
Remove-Item -Path ./vmbso-customer-portal-v2, ./.paportal -Recurse -Force -ErrorAction SilentlyContinue
