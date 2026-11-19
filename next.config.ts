import type {NextConfig} from "next";
const config:NextConfig={distDir:process.env.LOANFLOW_DIST_DIR||".next",serverExternalPackages:["pg","@electric-sql/pglite"],async headers(){return [{source:"/(.*)",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"X-Frame-Options",value:"DENY"}]}]}};
export default config;
