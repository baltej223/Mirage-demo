use axum::{routing::{get, post}, Json, Router, http::StatusCode};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(health))
        .route("/api/checkAnswer", post(api_check_answer))
    ;

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Listening on http://{}", addr);

    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), app)
        .await
        .unwrap();
}

async fn health() -> &'static str {
    "OK"
}

// /api/checkAnswer
// req body => {questionId: uuid, answer: string, lat: double float idk whatever, long: also double float idk whatever, user}
// res json => { wrong answer }, status 467 || { not found }, status 404, { questionId, question } 
// description: fetch question from uuid, then strip and normalise (lowercase) the answer, then match it with the answer string, if correct, check haversine distance of lat long from question location, if within DISTANCE (50m by default in ENV), find team of user from db and append entire team of user to the question under "foundBy" field (array), then call findRandomLeastFound() and return the question
#[derive(Debug, Deserialize)]
struct CheckAnswerRequest {
    questionId: String,
    answer: String,
    lat: f64,
    lng: f64
}
#[derive(Debug, Serialize)]
struct CheckAnswerResponse {}
async fn api_check_answer(Json(req): Json<CheckAnswerRequest>) -> (StatusCode, Json<CheckAnswerResponse>) {
    #[cfg(debug_assertions)]
    println!("/api/checkAnswer: {:?}", req);

    let response = CheckAnswerResponse {};
    (StatusCode::NOT_FOUND, Json(response))
}
