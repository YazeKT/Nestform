// Node-API binding around the original Deepnest/Boost polygon convolution.
// The convolution and numeric scaling are intentionally retained.
#include <napi.h>
#include "convolution.h"

struct Coordinate { double x, y; };
std::vector<Coordinate> readRing(const Napi::Env& env, const Napi::Value& value) {
  if (!value.IsArray()) throw Napi::TypeError::New(env, "A polygon must be an array");
  auto ring = value.As<Napi::Array>();
  if (ring.Length() < 3 || ring.Length() > 100000) throw Napi::RangeError::New(env, "Invalid polygon size");
  std::vector<Coordinate> result;
  for (uint32_t i=0;i<ring.Length();i++) {
    if (!ring.Get(i).IsObject()) throw Napi::TypeError::New(env, "Invalid coordinate");
    auto p=ring.Get(i).As<Napi::Object>();
    if (!p.Get("x").IsNumber() || !p.Get("y").IsNumber()) throw Napi::TypeError::New(env, "Invalid coordinate");
    double x=p.Get("x").As<Napi::Number>().DoubleValue(),y=p.Get("y").As<Napi::Number>().DoubleValue();
    if (!std::isfinite(x)||!std::isfinite(y)||std::fabs(x)>1e12||std::fabs(y)>1e12) throw Napi::RangeError::New(env,"Coordinate out of range");
    result.push_back({x,y});
  }
  return result;
}
Napi::Value calculateNFP(const Napi::CallbackInfo& info) {
  auto env=info.Env();
  if (info.Length()!=1 || !info[0].IsObject()) throw Napi::TypeError::New(env,"Expected {A, B}");
  auto group=info[0].As<Napi::Object>();
  auto A=readRing(env,group.Get("A")),B=readRing(env,group.Get("B"));
  double ax0=0,ax1=0,ay0=0,ay1=0,bx0=0,bx1=0,by0=0,by1=0;
  for(auto p:A){ax0=std::min(ax0,p.x);ax1=std::max(ax1,p.x);ay0=std::min(ay0,p.y);ay1=std::max(ay1,p.y);}
  for(auto p:B){bx0=std::min(bx0,p.x);bx1=std::max(bx1,p.x);by0=std::min(by0,p.y);by1=std::max(by1,p.y);}
  double maxda=std::max(std::max(ax1+bx1,std::fabs(ax0+bx0)),std::max(ay1+by1,std::fabs(ay0+by0)));
  if(maxda<1)maxda=1;
  // Same float literal and int truncation as upstream; local scale is thread-safe.
  const double inputscale=(0.1f*(double)std::numeric_limits<int>::max())/maxda;
  auto polygonFrom=[&](const std::vector<Coordinate>& points,bool negate){
    std::vector<point> pts;
    for(auto p:points){int x=(int)(inputscale*p.x),y=(int)(inputscale*p.y);pts.emplace_back(negate?-x:x,negate?-y:y);}
    polygon poly;boost::polygon::set_points(poly,pts.begin(),pts.end());return poly;
  };
  polygon_set a,b,c; a+=polygonFrom(A,false);
  auto sourceA=group.Get("A").As<Napi::Array>();
  auto holesValue=sourceA.Get("children");
  if(holesValue.IsArray()){
    auto holes=holesValue.As<Napi::Array>();
    for(uint32_t i=0;i<holes.Length();i++)a-=polygonFrom(readRing(env,holes.Get(i)),false);
  }
  b+=polygonFrom(B,true);
  convolve_two_polygon_sets(c,a,b);
  std::vector<polygon> polys;c.get(polys);
  auto result=Napi::Array::New(env,polys.size());
  auto writeRing=[&](auto begin,auto end){
    auto out=Napi::Array::New(env);uint32_t j=0;
    for(auto it=begin;it!=end;++it){auto p=Napi::Object::New(env);p.Set("x",(double)(*it).get(boost::polygon::HORIZONTAL)/inputscale+B[0].x);p.Set("y",(double)(*it).get(boost::polygon::VERTICAL)/inputscale+B[0].y);out.Set(j++,p);}return out;
  };
  for(uint32_t i=0;i<polys.size();i++){
    auto ring=writeRing(polys[i].begin(),polys[i].end());auto children=Napi::Array::New(env);uint32_t j=0;
    for(auto it=boost::polygon::begin_holes(polys[i]);it!=boost::polygon::end_holes(polys[i]);++it)children.Set(j++,writeRing((*it).begin(),(*it).end()));
    ring.Set("children",children);result.Set(i,ring);
  }
  return result;
}
Napi::Object Init(Napi::Env env,Napi::Object exports){exports.Set("calculateNFP",Napi::Function::New(env,calculateNFP));return exports;}
NODE_API_MODULE(nestform,Init)
