<?php

namespace app\api\controller;

use app\api\model\wanlshop\GoodsSpu;
use app\api\model\WanlshopGoodsModel;
use app\common\controller\Api;
use think\Exception;
use think\Log;

/**
 * 首页接口
 */
class Index extends Api
{
    protected $noNeedLogin = ['*'];
    protected $noNeedRight = ['*'];

    /**
     * 首页
     *
     */
    public function index()
    {
        $this->success('请求成功');
    }


    public function addgoods()
    {
        $param = input();
        try{
            $shop_id = 1;
            $shop_category_id = 1;
            $category_id = 108;
            $title = $param['title'];
            $image = $param['image'];
            $images = $param['images'];
            $content = $param['content'];
            $freight_id = 1;
            $grounding = 0;
            $weigh=1;
            $sku = $param['sku'];
            $data = array();
            $data['shop_id']=$shop_id;
            $data['shop_category_id']=$shop_category_id;
            $data['category_id']=$category_id;
            $data['title']=$title;
            $data['image']=$image;
            $data['images']=$images;
            $data['content']=$content;
            $data['freight_id']=$freight_id;
            $data['grounding']=$grounding;
            $data['weigh']=$weigh;
            $info = WanlshopGoodsModel::create($data);
            $id = $info->id;
            foreach ($sku as $k=>$v){
                $data2 = array();
                $skuname = $v['skname'];
                $values = $v['values'];
                $str='';
                foreach ($values as $key=>$val){
                    $str.=$val;
                    if (($key+1)!=count($values)){
                        $str.=',';
                    }
                }
                $data2['goods_id']=$id;
                $data2['name']=$skuname;
                $data2['item']=$str;
                $data2['createtime']=time();
                $data2['status']='normal';
                $data2['updatetime']=time();
                GoodsSpu::create($data2);
            }


        }catch (Exception $e){
            Log::write($e->getMessage());
        }
    }


}
