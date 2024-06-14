import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { v4 as uuidv4 } from 'uuid';
import { CardObject, FincodeInstance, FincodeUI, PaymentObject, TokenIssuingResponse, initFincode, } from "@fincode/js"
import { Fincode as ServerFincode, PayType as ServerPayType, PaymentObject as ServerPaymentObject, createFincode as serverCreateFincode } from "@fincode/node"

// {"cardNo":"4111111111111111","CVC":"111","expire":"3311","year":"33","month":"11","holderName":"AVA","payTimes":"1","method":"1"}
type CardFormInfo = {
  cardNo?: string;
  CVC?: string;
  expire?: string
  year?: string
  month?: string
  holderName?: string
  payTimes?: string
  method?: string
}

type CardInput = {
  customer_id: string,       // 顧客ID
  default_flag: "0" | "1",     // デフォルトフラグ
  card_no: string,               // カード番号
  expire: string,                // カード有効期限(yymm)
  holder_name?: string,       // カード名義人
  security_code?: string,   // セキュリティコード
}

type TransactionInput = {
  id: string,
  pay_type: "Card",
  access_id: string,
  token: string,
  method: "1" | "2",
  pay_times?: string
}

type LocalCustomer = {
  customerId: string
  cardId?: string
  tokenId?: {token: string}[]
  accessId?: string
  orderId?: string
  paymentExecStatus?: string
}

class ServerMock {
  private fincode: ServerFincode
  public customerIds: string[] = []
  constructor(privateKey: string) {
    this.fincode = serverCreateFincode({ apiKey:privateKey, isLiveMode: false })
  }
  public async registerThreeCustomers(): Promise<string[]> {

    const createCustomer = async () => {
      const customerId = "customer-" + uuidv4();
      const req = {
        "id": customerId,
        "name": "string",
        "email": `customer+${customerId}@localhost.localdomain`,
        "phone_cc": "81",
        "phone_no": "09012341234",
        "addr_city": "Tokyo",
        "addr_country": "392",
        "addr_line_1": "Chiyoda-ku",
        "addr_line_2": "Chiyoda",
        "addr_line_3": "1-1",
        "addr_post_code": "1000001",
        "addr_state": ""
      }
      const createResult = await this.fincode.customers.create(req)
      this.customerIds.push(createResult.id);
    }
    for (let i = 0; i < 3; i++){
      await createCustomer();
    }

    return this.customerIds;
  }
  public async registerThreeOrders(customers: LocalCustomer[]): Promise<ServerPaymentObject[]>{
    const payment = {
      "pay_type": "Card" as ServerPayType,
      "job_code": "AUTH" as "AUTH",
      "amount": "500",
      "tax": "550",
      "client_field_1": "string",
      "client_field_2": "string",
      "client_field_3": "string",
      "tds_type": "0" as "0",
      "td_tenant_name": "string",
      "tds2_type": "2" as "2"
    }
    const paymentObjects: ServerPaymentObject[] = [];
    for (let _cuustomer of customers){
      const paymentCreateResult = await this.fincode.payments.create(payment)
      paymentObjects.push(paymentCreateResult);
    }
    return paymentObjects;
  }
  public randomUser(): number[] { return [0]; }
  public async confirmTransaction(customers :LocalCustomer[], indexList: number[]): Promise<ServerPaymentObject[]>{
    const paymentObjects: ServerPaymentObject[] = [];
    for (let index of indexList){
      const customer = customers[index];
      const confirmInput = {
        "pay_type": "Card" as "Card",
        "access_id": customer.accessId as string,
      }
      const paymentCaptureResult = await this.fincode.payments.capture(customer.orderId as string, confirmInput)
      paymentObjects.push(paymentCaptureResult)
    }
    return paymentObjects;
  }
  public async cancelTransaction(customers :LocalCustomer[], indexList: number[]): Promise<ServerPaymentObject[]>{
    const paymentObjects: ServerPaymentObject[] = [];
    for (let index of indexList){
      const customer = customers[index];
      const cancelInput = {
        "pay_type": "Card" as "Card",
        "access_id": customer.accessId as string,
      }
      const paymentCaptureResult = await this.fincode.payments.cancel(customer.orderId as string, cancelInput)
      paymentObjects.push(paymentCaptureResult)
    }
    return paymentObjects;
  }
}


function App() {

  const [fincodeUI, setFincodeUI] = useState<FincodeUI>()
  const [fincode, setFincode] = useState<FincodeInstance>()
  const [serverMock, setServerMock] = useState<ServerMock>()


  const callPaymentApi = async (fincodeInstance: FincodeInstance, cardInfo: CardFormInfo, serverMock: ServerMock) => {

    // 顧客登録(サーバー)
    const customerIds = await serverMock.registerThreeCustomers();
    if (customerIds.length != 3){
      console.log(`customer registration failed. ${JSON.stringify(customerIds)}`)
      return;
    }

    const customerList: LocalCustomer[] = customerIds.map(id => ({customerId: id}))

    for (let customer of customerList){
      const card: CardInput = {
        customer_id: customer.customerId,       // 顧客ID
        default_flag: ("1" as "1"),     // デフォルトフラグ
        card_no: cardInfo.cardNo || "invalid card_no",               // カード番号
        expire: cardInfo.expire || "invalid expire",                // カード有効期限(yymm)
        holder_name: cardInfo.holderName,       // カード名義人
        security_code: cardInfo.CVC,   // セキュリティコード
      }
  
      // カード登録
      const runCard = async (fi: FincodeInstance, card: CardInput): Promise<CardObject> => {
        return new Promise<CardObject>((resolve, reject) => {
          fi.cards(card,
            (status, response)  => {
              if (status === 200) {
                // リクエスト正常時の処理
                console.log(response);
                resolve(response)
              } else {
                // リクエストエラー時の処理
                reject(`request failed`)
              }
            },
            () => {
              // 通信エラー処理。
              console.log(`connection error`)
              reject(`request failed: connection error`)
            }
          )
        })
      }
      const cardRegisterResult = await runCard(fincodeInstance, card);
      console.log(cardRegisterResult)
      customer.cardId = cardRegisterResult.id
    
      // カードトークン発行
      const runToken = async (fi: FincodeInstance, card: CardInput): Promise<TokenIssuingResponse> => {
        return new Promise<TokenIssuingResponse>((resolve, reject) => {
          fi.tokens(card,
            (status, response)  => {
              if (status === 200) {
                // リクエスト正常時の処理
                console.log(response);
                resolve(response)
              } else {
                // リクエストエラー時の処理
                reject(`request failed`)
              }
            },
            () => {
              // 通信エラー処理。
              console.log(`connection error`)
              reject(`request failed: connection error`)
            }
          )
        })
      }
      const issueCardTokenResult = await runToken(fincodeInstance, card);
      console.log(issueCardTokenResult)
      customer.tokenId = issueCardTokenResult.list;
    }

    // 決済登録(サーバー)
    const orders = await serverMock.registerThreeOrders(customerList);

    // 決済実行
    if(orders.length != customerList.length){
      console.log(`orders creation failed: ${JSON.stringify(orders)}`)
      return;
    }
    let orderIndex = 0;
    const runPayments = async (fi: FincodeInstance, transaction: TransactionInput): Promise<PaymentObject> => {
      return new Promise<PaymentObject>((resolve, reject) => {
        fi.payments(transaction,
          (status, response)  => {
            if (status === 200) {
              // リクエスト正常時の処理
              console.log(response);
              resolve(response)
            } else {
              // リクエストエラー時の処理
              reject(`request failed`)
            }
          },
          () => {
            // 通信エラー処理。
            console.log(`connection error`)
            reject(`request failed: connection error`)
          }
        )
      })
    }

    for(let customer of customerList){
      customer.orderId = orders[orderIndex].id
      customer.accessId = orders[orderIndex].access_id

      const transaction: TransactionInput = {
        pay_type: "Card",
        id: customer.orderId,
        access_id: customer.accessId,
        method: "1",
        // customer_id: customer.customerId,
        token: (customer.tokenId ?? [{"token": ""}])[0].token,
      }
      const paymentResult = await runPayments(fincodeInstance, transaction);
      // put paymentResult into customer
      customer.paymentExecStatus = paymentResult.status;

      orderIndex++;
    }
    if (customerList.some(v => v.paymentExecStatus != "AUTHORIZED")){
      console.log(`payment exec failed: ${JSON.stringify(customerList)}`)
      return;
    }

    // 抽選(サーバー)
    const customerWinIndexList = serverMock.randomUser();
    const customerLoseIndexList = Object.keys(customerList).filter(i => !customerWinIndexList.includes(+i)).map(i => +i)

    // 売上確定(サーバー)
    const winOrders = await serverMock.confirmTransaction(customerList, customerWinIndexList);

    if(winOrders.some(v => v.status != "CAPTURED")){
      console.log(`payment capture failed: ${JSON.stringify(winOrders)}`)
      return;
    }

    // キャンセル(サーバー)
    const loseOrders = await serverMock.cancelTransaction(customerList, customerLoseIndexList);

    if(loseOrders.some(v => v.status != "CANCELED")){
      console.log(`payment cancel failed: ${JSON.stringify(loseOrders)}`)
      return;
    }

    console.log(`all operations successful.`)
  }

  const main = async () => {
    const locationHashElements = (location.hash || "#,").substring(1).split(",")
    if (locationHashElements.length < 2 || !locationHashElements[0] || !locationHashElements[1]){
      alert(`private/public key not available`);
      console.log(`location.hash: ${location.hash}, locationHashElements: ${JSON.stringify(locationHashElements)}`)
      return;
    }
    const privateKey = locationHashElements[1]
    const publicKey = locationHashElements[0]


    const initializedFincode = await initFincode({publicKey});
    // const uniqueId = uuidv4();
    // initializedFincode.setIdempotentKey(uniqueId)

    const ui = initializedFincode.ui({layout: "vertical"});
    ui.create("payments",{layout: "vertical"})
    ui.mount("fincode",'400');
    setFincodeUI(ui);
    setFincode(initializedFincode)

    const serverOpsMock = new ServerMock(privateKey);
    setServerMock(serverOpsMock);
  }

  const onClickPayment = async () => {
    if (fincodeUI && fincode && serverMock){
      fincodeUI.getFormData().then((result) => {
        console.log(`result: ${JSON.stringify(result)}`);
        callPaymentApi(fincode, result, serverMock);
      });  
    }
  }

  useEffect(() => {main()}, []);

  return (
    <>
      <h1>Fincode test</h1>
      <div id="fincode-form">
        <div id="fincode">
        </div>
        <button onClick={onClickPayment} >
            <span>3人登録1人当選のテスト実行</span>
        </button>
      </div>
    </>
  )
}

export default App
