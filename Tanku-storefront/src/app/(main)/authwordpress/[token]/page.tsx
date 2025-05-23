import { Metadata } from "next"
import jwt from "jsonwebtoken"
import { loginWordpress, retrieveCustomer } from "@lib/data/customer";
import { LoginWPTemplate } from "@modules/account/templates/loginwp-template";


type Props = {
  params: {
    token: string
  }
}


export const metadata: Metadata = {
  title: "Sign in wp",
  description: "Sign in to your Medusa Store account. wp",
}


export default async function AuthWordpressPage(props: Props) {
  const {token} = await props.params
const customer = await retrieveCustomer().catch(() => null)

if (customer) {
  return (<>
    <h1>Ya estas logueado</h1>
    </>)
    
}else 
  return (
    <>
    <LoginWPTemplate token={token} />
    </>
  )
}
